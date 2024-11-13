// DOM elements
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const statusDiv = document.getElementById('status');
const faceVerification = document.getElementById('face-verification');
const votingSystem = document.getElementById('voting-system');

// Canvas context for drawing
const ctx = overlay.getContext('2d');

// Reference face descriptors array
let authorizedDescriptors = [];
let isProcessing = false;
let currentVoterId = null;

// Initialize face detection
async function initFaceDetection() {
    try {
        // Show video element before requesting camera access
        video.style.display = 'block';
        
        statusDiv.textContent = 'Cargando modelos de reconocimiento facial...';

        // Load face-api models
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);

        statusDiv.textContent = 'Cargando fotos de referencia...';

        try {
            // Load all authorized voter images
            const response = await fetch('/api/authorized-voters');
            const voterImages = await response.json();
            
            // Process each authorized voter image
            for (const imagePath of voterImages) {
                const img = new Image();
                img.src = imagePath;
                
                await new Promise((resolve, reject) => {
                    img.onload = async () => {
                        try {
                            const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                .withFaceLandmarks()
                                .withFaceDescriptor();
                            
                            if (detection) {
                                // Extract voter ID from filename
                                const voterId = imagePath.split('/').pop().split('.')[0];
                                authorizedDescriptors.push({
                                    descriptor: detection.descriptor,
                                    voterId: voterId
                                });
                                resolve();
                            } else {
                                console.warn(`No face detected in ${imagePath}`);
                                resolve();
                            }
                        } catch (error) {
                            console.error(`Error processing image ${imagePath}:`, error);
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        console.error(`Failed to load image ${imagePath}`);
                        resolve();
                    };
                });
            }

            if (authorizedDescriptors.length === 0) {
                throw new Error('No se pudieron cargar rostros autorizados');
            }

            statusDiv.textContent = 'Iniciando cámara...';
            
            try {
                // Request camera with specific constraints
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    } 
                });
                
                video.srcObject = stream;
                
                // Wait for video to be ready
                await new Promise((resolve) => {
                    video.onloadedmetadata = resolve;
                });
                
                // Set canvas dimensions to match video
                overlay.width = video.videoWidth;
                overlay.height = video.videoHeight;
                
                // Ensure video is playing
                await video.play();
                
                statusDiv.textContent = 'Por favor, mire a la cámara...';
                
                // Start face detection
                detectFace();
            } catch (cameraError) {
                console.error('Error accessing camera:', cameraError);
                statusDiv.textContent = 'Error: No se pudo acceder a la cámara. Por favor, verifique los permisos.';
            }
        } catch (error) {
            console.error('Error loading authorized voters:', error);
            statusDiv.textContent = 'Error: No se pudieron cargar los votantes autorizados';
        }

    } catch (error) {
        console.error('Error initializing face detection:', error);
        statusDiv.textContent = 'Error al iniciar la verificación facial. Por favor, recargue la página.';
    }
}

// Check voter status
async function checkVoterStatus(voterId) {
    try {
        const response = await fetch(`/api/voter-status/${voterId}`);
        const status = await response.json();
        return status;
    } catch (error) {
        console.error('Error checking voter status:', error);
        return null;
    }
}

// Face detection loop
async function detectFace() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        // Clear previous drawings
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        if (detection && authorizedDescriptors.length > 0) {
            // Draw face detection
            const dims = faceapi.matchDimensions(overlay, video, true);
            const resizedDetection = faceapi.resizeResults(detection, dims);
            
            // Draw face landmarks with green color for better visibility
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            faceapi.draw.drawFaceLandmarks(overlay, resizedDetection);

            // Find best match among authorized faces
            let bestMatch = {
                distance: 1.0,
                voterId: null
            };

            for (const auth of authorizedDescriptors) {
                const distance = faceapi.euclideanDistance(detection.descriptor, auth.descriptor);
                if (distance < bestMatch.distance) {
                    bestMatch = {
                        distance: distance,
                        voterId: auth.voterId
                    };
                }
            }

            const threshold = 0.5; // Threshold for face match

            if (bestMatch.distance < threshold) {
                // Check if voter has already voted
                const voterStatus = await checkVoterStatus(bestMatch.voterId);
                
                if (!voterStatus) {
                    statusDiv.textContent = 'Error verificando estado del votante';
                    isProcessing = false;
                    requestAnimationFrame(detectFace);
                    return;
                }

                if (voterStatus.hasCompletedVoting) {
                    statusDiv.textContent = 'Esta persona ya ha completado su votación';
                    isProcessing = false;
                    requestAnimationFrame(detectFace);
                    return;
                }

                statusDiv.textContent = '¡Rostro verificado correctamente!';
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Stop video stream and hide verification
                const stream = video.srcObject;
                if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                }
                
                faceVerification.style.display = 'none';
                
                // Store voter ID for voting
                currentVoterId = bestMatch.voterId;
                
                // Show voting system and initialize
                votingSystem.style.display = 'block';
                window.hasVerifiedFace = true;
                window.currentVoterId = currentVoterId;
                window.voterStatus = voterStatus;
                if (typeof initializeVoting === 'function') {
                    initializeVoting(voterStatus);
                }
                return;
            }

            const matchPercentage = Math.round((1 - bestMatch.distance) * 100);
            statusDiv.textContent = `Verificando rostro... (${matchPercentage}% mejor coincidencia)`;
        } else {
            statusDiv.textContent = 'No se detecta rostro. Por favor, mire directamente a la cámara.';
        }

        isProcessing = false;
        // Continue detection loop
        requestAnimationFrame(detectFace);
    } catch (error) {
        console.error('Error in face detection:', error);
        statusDiv.textContent = 'Error en la verificación facial. Por favor, recargue la página.';
        isProcessing = false;
    }
}

// Start the face verification process when document is loaded
document.addEventListener('DOMContentLoaded', initFaceDetection);
