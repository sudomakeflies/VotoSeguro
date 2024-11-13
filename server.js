const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const app = express();
const port = process.env.PORT || 3000;

// Initialize lowdb
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set default data
db.defaults({
    candidates: {
        personero: [],
        contralor: []
    },
    votes: {
        personero: {},
        contralor: {}
    },
    voters: {},
    votedIds: [] // New array to track all voted IDs
}).write();

// Serve static files
app.use(express.static(__dirname));

// Middleware to parse JSON bodies with increased limit for images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure images directory exists
async function ensureImageDirectory() {
    const imageDir = path.join(__dirname, 'images');
    try {
        await fs.access(imageDir);
    } catch {
        await fs.mkdir(imageDir, { recursive: true });
    }
}

// Candidate Management Routes
app.get('/api/candidates/:position', (req, res) => {
    try {
        const { position } = req.params;
        if (!['personero', 'contralor'].includes(position)) {
            return res.status(400).json({ error: 'Invalid position' });
        }

        const candidates = db.get(`candidates.${position}`).value();
        res.json(candidates);
    } catch (error) {
        console.error('Error getting candidates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/candidates/:position', async (req, res) => {
    try {
        const { position } = req.params;
        const { code, name, image } = req.body;
        
        if (!['personero', 'contralor'].includes(position)) {
            return res.status(400).json({ error: 'Invalid position' });
        }

        // Validate required fields
        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' });
        }

        // Validate code format
        if (!/^\d{2}$/.test(code)) {
            return res.status(400).json({ error: 'Code must be two digits' });
        }

        // Check if code already exists in either position
        const existsPersonero = db.get('candidates.personero')
            .find({ code })
            .value();
        const existsContralor = db.get('candidates.contralor')
            .find({ code })
            .value();

        if (existsPersonero || existsContralor) {
            return res.status(400).json({ error: 'Candidate code already exists' });
        }

        // Ensure images directory exists
        await ensureImageDirectory();

        // Handle image upload if provided
        let imagePath = `/images/${position}_${code}.jpg`;
        if (image) {
            try {
                const imageData = image.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(imageData, 'base64');
                await fs.writeFile(path.join(__dirname, 'images', `${position}_${code}.jpg`), imageBuffer);
            } catch (error) {
                console.error('Error saving image:', error);
                return res.status(500).json({ error: 'Failed to save candidate image' });
            }
        }

        // Add new candidate
        db.get(`candidates.${position}`)
            .push({
                code,
                name,
                image: imagePath
            })
            .write();

        res.json({ message: 'Candidate added successfully' });
    } catch (error) {
        console.error('Error adding candidate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/candidates/:position/:code', async (req, res) => {
    try {
        const { position, code } = req.params;
        const { name, image } = req.body;

        if (!['personero', 'contralor'].includes(position)) {
            return res.status(400).json({ error: 'Invalid position' });
        }

        const candidate = db.get(`candidates.${position}`)
            .find({ code })
            .value();

        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Ensure images directory exists
        await ensureImageDirectory();

        // Handle image update if provided
        if (image) {
            try {
                const imageData = image.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(imageData, 'base64');
                await fs.writeFile(path.join(__dirname, 'images', `${position}_${code}.jpg`), imageBuffer);
            } catch (error) {
                console.error('Error updating image:', error);
                return res.status(500).json({ error: 'Failed to update candidate image' });
            }
        }

        // Update candidate
        db.get(`candidates.${position}`)
            .find({ code })
            .assign({ name: name || candidate.name })
            .write();

        res.json({ message: 'Candidate updated successfully' });
    } catch (error) {
        console.error('Error updating candidate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/candidates/:position/:code', async (req, res) => {
    try {
        const { position, code } = req.params;

        if (!['personero', 'contralor'].includes(position)) {
            return res.status(400).json({ error: 'Invalid position' });
        }

        const candidate = db.get(`candidates.${position}`)
            .find({ code })
            .value();

        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Remove candidate image if it exists
        try {
            await fs.unlink(path.join(__dirname, 'images', `${position}_${code}.jpg`));
        } catch (error) {
            console.error('Error deleting candidate image:', error);
            // Continue even if image deletion fails
        }

        // Remove candidate from database
        db.get(`candidates.${position}`)
            .remove({ code })
            .write();

        // Remove votes for this candidate
        if (db.get(`votes.${position}.${code}`).value()) {
            db.get(`votes.${position}`)
                .unset(code)
                .write();
        }

        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to submit a vote
app.post('/api/vote', (req, res) => {
    try {
        const { voterId, position, candidateId } = req.body;

        if (!voterId || !position || !candidateId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['personero', 'contralor'].includes(position)) {
            return res.status(400).json({ error: 'Invalid position' });
        }

        // Check if voter ID has already voted at all
        const hasVoted = db.get('votedIds').includes(voterId).value();
        if (hasVoted) {
            return res.status(400).json({ error: 'This voter has already participated in the election' });
        }

        // Check if voter has already voted for this position
        if (db.get(`voters.${voterId}.${position}`).value()) {
            return res.status(400).json({ error: 'Voter has already voted for this position' });
        }

        // Record the vote
        db.set(`voters.${voterId}.${position}`, true).write();
        
        // Update vote count
        const currentVotes = db.get(`votes.${position}.${candidateId}`).value() || 0;
        db.set(`votes.${position}.${candidateId}`, currentVotes + 1).write();

        // Add voter ID to voted list if they've voted for both positions
        const hasVotedBoth = db.get(`voters.${voterId}.personero`).value() && 
                            db.get(`voters.${voterId}.contralor`).value();
        if (hasVotedBoth) {
            db.get('votedIds').push(voterId).write();
        }

        res.json({ message: 'Vote recorded successfully' });
    } catch (error) {
        console.error('Error recording vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to check voter status
app.get('/api/voter-status/:voterId', (req, res) => {
    try {
        const { voterId } = req.params;
        
        // Check if voter has already participated
        const hasVoted = db.get('votedIds').includes(voterId).value();
        if (hasVoted) {
            return res.json({
                personero: true,
                contralor: true,
                hasCompletedVoting: true
            });
        }

        const status = {
            personero: !!db.get(`voters.${voterId}.personero`).value(),
            contralor: !!db.get(`voters.${voterId}.contralor`).value(),
            hasCompletedVoting: false
        };
        res.json(status);
    } catch (error) {
        console.error('Error checking voter status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to get vote results
app.get('/api/results', (req, res) => {
    try {
        const results = {
            personero: {
                votes: db.get('votes.personero').value() || {},
                total: Object.values(db.get('votes.personero').value() || {}).reduce((a, b) => a + b, 0)
            },
            contralor: {
                votes: db.get('votes.contralor').value() || {},
                total: Object.values(db.get('votes.contralor').value() || {}).reduce((a, b) => a + b, 0)
            }
        };
        res.json(results);
    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to get authorized voters
app.get('/api/authorized-voters', async (req, res) => {
    try {
        const authorizedVoterDir = path.join(__dirname, 'images/authorized_voters');
        const files = await fs.readdir(authorizedVoterDir);
        const imagePaths = files.map(file => path.join('/images/authorized_voters', file));
        res.json(imagePaths);
    } catch (error) {
        console.error('Error loading authorized voters:', error);
        res.status(500).json({ error: 'Failed to load authorized voters' });
    }
});

// Route to delete all votes and reset election data
app.delete('/api/reset-elections', (req, res) => {
    try {
        // Reset votes and voter data
        db.set('votes', { personero: {}, contralor: {} }).write();
        db.set('voters', {}).write();
        db.set('votedIds', []).write();

        res.json({ message: 'Elections reset successfully' });
    } catch (error) {
        console.error('Error resetting elections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server with error handling
function startServer(currentPort) {
    const server = app.listen(currentPort, () => {
        console.log(`Server running at http://localhost:${currentPort}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.log(`Port ${currentPort} is busy, trying next port...`);
            startServer(currentPort + 1);
        } else {
            console.error('Server error:', error);
        }
    });
}

// Start the server
startServer(port);
