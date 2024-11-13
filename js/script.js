// Global variables
let seuVotoPara = document.querySelector('.superior--left span');
let cargo = document.querySelector('.superior--left .d-2 span');
let descricao = document.querySelector('.superior--left .d-4');
let aviso = document.querySelector('.rodape');
let lateral = document.querySelector('.superior--right');
let numeros = document.querySelector('.superior--left .d-3');

// Current state
let etapaAtual = 0;
let numero = '';
let votoBranco = false;
let currentPosition = 'personero';
let candidates = {
    personero: {},
    contralor: {}
};

// Load candidates from database
async function loadCandidates() {
    try {
        // Load Personero candidates
        const personeroResponse = await fetch('/api/candidates/personero');
        const personeroCandidates = await personeroResponse.json();
        personeroCandidates.forEach(candidate => {
            candidates.personero[candidate.code] = {
                nome: candidate.name,
                foto: candidate.image
            };
        });

        // Load Contralor candidates
        const contralorResponse = await fetch('/api/candidates/contralor');
        const contralorCandidates = await contralorResponse.json();
        contralorCandidates.forEach(candidate => {
            candidates.contralor[candidate.code] = {
                nome: candidate.name,
                foto: candidate.image
            };
        });

        // Update candidate display
        updateCandidateDisplay('personero');
        updateCandidateDisplay('contralor');
    } catch (error) {
        console.error('Error loading candidates:', error);
        alert('Error al cargar los candidatos');
    }
}

// Update candidate display based on position
function updateCandidateDisplay(position) {
    const container = document.getElementById(`${position}-candidates`);
    if (!container) return;

    const areaWidth = container.querySelector('.area--width');
    if (!areaWidth) return;

    const candidatesList = Object.entries(candidates[position]).map(([code, candidate]) => `
        <div class="area--cabeca">
            <div class="cabeca">
                <img src="${candidate.foto}" alt="${candidate.nome}">
                <div class="dados">Codigo: ${code}</div>
                <div class="dados">${candidate.nome}</div>
            </div>
        </div>
    `).join('');

    areaWidth.innerHTML = candidatesList;
}

// Initialize voting based on voter status
function initializeVoting(voterStatus) {
    if (!voterStatus.personero) {
        currentPosition = 'personero';
        comecarVotacao();
    } else if (!voterStatus.contralor) {
        currentPosition = 'contralor';
        comecarVotacao();
    } else {
        alert('Ya has completado todos tus votos');
        window.location.reload();
    }

    // Load candidates after initializing
    loadCandidates();
}

function comecarVotacao() {
    numero = '';
    votoBranco = false;

    numeros.style.display = 'flex';
    numeros.innerHTML = '';
    seuVotoPara.style.display = 'none';
    cargo.innerHTML = currentPosition.toUpperCase();
    descricao.innerHTML = '';
    aviso.style.display = 'none';
    lateral.innerHTML = '';

    // Always 2 digits for both positions
    for(let i = 0; i < 2; i++) {
        let pisca = i == 0 ? ' pisca' : '';
        numeros.innerHTML += `
            <div class="quadrado${pisca}"></div>
        `;
    }

    // Show appropriate candidate list
    document.getElementById('personero-candidates').style.display = 
        currentPosition === 'personero' ? 'block' : 'none';
    document.getElementById('contralor-candidates').style.display = 
        currentPosition === 'contralor' ? 'block' : 'none';
}

function atualizaInterface() {
    let candidato = candidates[currentPosition][numero];

    let aviso = document.querySelector('.rodape');
    aviso.style.display = 'block';
    seuVotoPara.style.display = 'block';

    if(candidato) {
        let fotosHtml = '';
        fotosHtml += `
            <div class="candidato">
                <img src="${candidato.foto}" alt="${candidato.nome}">
                <div class="cargo">
                    <p>${currentPosition.toUpperCase()}</p>
                </div>
            </div>
        `;
        lateral.innerHTML = fotosHtml;
        descricao.innerHTML = `Nome: ${candidato.nome}<br/>Número: ${numero}`;
        numeros.querySelectorAll('.quadrado').forEach(quad => quad.classList.remove('pisca'));
    } else {
        descricao.innerHTML = '<div class="aviso-grande pisca">VOTO NULO</div>';
        numeros.querySelectorAll('.quadrado').forEach(quad => quad.classList.remove('pisca'));
    }
}

async function submitVote(position, candidateId) {
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                voterId: window.currentVoterId,
                position: position,
                candidateId: candidateId
            })
        });

        if (!response.ok) {
            throw new Error('Error al registrar el voto');
        }

        return true;
    } catch (error) {
        console.error('Error submitting vote:', error);
        alert('Error al registrar el voto');
        return false;
    }
}

function clicou(n) {
    let elNumero = document.querySelector('.quadrado.pisca');
    if(elNumero !== null) {
        elNumero.innerHTML = n;
        numero = `${numero}${n}`;

        elNumero.classList.remove('pisca');
        if(elNumero.nextElementSibling !== null) {
            elNumero.nextElementSibling.classList.add('pisca');
        } else {
            atualizaInterface();
        }
    }
}

function branco() {
    numero = '';
    votoBranco = true;
    seuVotoPara.style.display = 'block';
    aviso.style.display = 'block';
    numeros.innerHTML = '';
    descricao.innerHTML = '<div class="aviso-grande pisca">VOTO EN BLANCO</div>';
    lateral.innerHTML = '';
}

function corrige() {
    comecarVotacao();
}

async function confirme() {
    let votoConfirmado = false;

    if(votoBranco === true) {
        votoConfirmado = true;
        if (!await submitVote(currentPosition, 'BLANCO')) {
            return;
        }
    } else if(numero.length === 2) {
        votoConfirmado = true;
        if (!await submitVote(currentPosition, numero)) {
            return;
        }
    }

    if(votoConfirmado) {
        // Check voter status again
        const voterStatus = await checkVoterStatus(window.currentVoterId);
        
        if (!voterStatus.personero && currentPosition === 'contralor') {
            currentPosition = 'personero';
            comecarVotacao();
        } else if (!voterStatus.contralor && currentPosition === 'personero') {
            currentPosition = 'contralor';
            comecarVotacao();
        } else {
            document.querySelector('.tela').innerHTML = '<div class="aviso-gigante pisca">FIN</div>';
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }
}

// Initialize candidates when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.hasVerifiedFace) {
        loadCandidates();
    }
});
