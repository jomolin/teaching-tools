// Noise Meter Widget Module
const NoiseMeterWidget = (function() {
    'use strict';
    
    // Use shared config if available, otherwise use defaults
    const CONSTANTS = typeof ClassroomConfig !== 'undefined' ? ClassroomConfig.NOISE_METER : {
        FFT_SIZE: 512,
        SMOOTHING: 0.8,
        DING_COOLDOWN: 2000,
        DING_FREQUENCY: 1200,
        DING_DURATION: 1.5,
        THRESHOLDS: [30, 40, 60, 75, 90],
        THRESHOLD_LABELS: [
            '🤫 SILENT',
            '👥 PARTNER VOICE',
            '🗣️ GROUP VOICE',
            '📢 PRESENTATION VOICE',
            '📊 OUTSIDE VOICE'
        ],
        DEFAULT_THRESHOLD: 2,
        WARNING_MULTIPLIER: 0.7
    };
    
    // Module state
    let noiseMeterActive = false;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let mediaStream = null;
    let animationId = null;
    let thresholdCount = 0;
    let lastDingTime = 0;
    
    // DOM element cache
    let noiseFillEl = null;
    let noiseLabelEl = null;
    let thresholdSlider = null;
    let thresholdCounter = null;
    let startBtn = null;
    let stopBtn = null;
    
    /**
     * Play a ding sound
     */
    function playDing() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.frequency.value = CONSTANTS.DING_FREQUENCY;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + CONSTANTS.DING_DURATION);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + CONSTANTS.DING_DURATION);
            
            // Clean up audio context after sound finishes
            setTimeout(() => {
                try {
                    audioCtx.close();
                } catch (error) {
                    console.error('Error closing ding audio context:', error);
                }
            }, CONSTANTS.DING_DURATION * 1000 + 100);
        } catch (error) {
            console.error('Error playing ding sound:', error);
        }
    }
    
    /**
     * Update the noise level visualization
     */
    function updateNoiseLevel() {
        if (!noiseMeterActive || !analyser || !noiseFillEl) {
            return;
        }
        
        try {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const percentage = Math.min((average / 128) * 100, 100);
            
            noiseFillEl.style.width = percentage + '%';
            
            // Get threshold level
            const thresholdLevel = thresholdSlider ? parseInt(thresholdSlider.value, 10) : CONSTANTS.DEFAULT_THRESHOLD;
            const threshold = CONSTANTS.THRESHOLDS[thresholdLevel];
            
            // Change color based on level
            if (percentage > threshold) {
                noiseFillEl.style.background = '#e74c3c';
                
                // Play ding if cooldown passed
                const now = Date.now();
                if (now - lastDingTime > CONSTANTS.DING_COOLDOWN) {
                    playDing();
                    lastDingTime = now;
                    thresholdCount++;
                    if (thresholdCounter) {
                        thresholdCounter.textContent = `Warnings: ${thresholdCount}`;
                    }
                }
            } else if (percentage > threshold * CONSTANTS.WARNING_MULTIPLIER) {
                noiseFillEl.style.background = '#f39c12';
            } else {
                noiseFillEl.style.background = '#2ecc71';
            }
            
            animationId = requestAnimationFrame(updateNoiseLevel);
        } catch (error) {
            console.error('Error updating noise level:', error);
            stopNoiseMeter();
        }
    }
    
    /**
     * Start the noise meter
     */
    async function startNoiseMeter() {
        try {
            // Request microphone access
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context and analyzer
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = CONSTANTS.FFT_SIZE;
            analyser.smoothingTimeConstant = CONSTANTS.SMOOTHING;
            
            // Connect microphone to analyzer
            microphone = audioContext.createMediaStreamSource(mediaStream);
            microphone.connect(analyser);
            
            noiseMeterActive = true;
            lastDingTime = 0;
            
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';
            
            updateNoiseLevel();
        } catch (error) {
            console.error('Microphone access error:', error);
            
            let errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is already in use by another application.';
            }
            
            alert(errorMessage);
            stopNoiseMeter();
        }
    }
    
    /**
     * Stop the noise meter and clean up resources
     */
    function stopNoiseMeter() {
        noiseMeterActive = false;
        
        // Cancel animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Disconnect microphone
        if (microphone) {
            try {
                microphone.disconnect();
            } catch (error) {
                console.error('Error disconnecting microphone:', error);
            }
            microphone = null;
        }
        
        // Close audio context
        if (audioContext) {
            try {
                audioContext.close();
            } catch (error) {
                console.error('Error closing audio context:', error);
            }
            audioContext = null;
        }
        
        // Stop media stream tracks
        if (mediaStream) {
            try {
                mediaStream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('Error stopping media stream:', error);
            }
            mediaStream = null;
        }
        
        analyser = null;
        
        // Reset UI
        if (noiseFillEl) noiseFillEl.style.width = '0%';
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    }
    
    /**
     * Reset the threshold counter
     */
    function resetThresholdCounter() {
        thresholdCount = 0;
        if (thresholdCounter) {
            thresholdCounter.textContent = 'Warnings: 0';
        }
    }
    
    /**
     * Update the threshold label
     */
    function updateThresholdLabel() {
        if (!thresholdSlider || !noiseLabelEl) return;
        
        const value = parseInt(thresholdSlider.value, 10);
        noiseLabelEl.textContent = CONSTANTS.THRESHOLD_LABELS[value];
    }
    
    /**
     * Create noise meter widget HTML
     */
    function createNoiseMeterWidget(defaultThreshold = CONSTANTS.DEFAULT_THRESHOLD) {
        return `
            <h2>Noise Meter</h2>
            <div class="threshold-slider">
                <input type="range" id="noiseThreshold" min="0" max="4" value="${defaultThreshold}" step="1">
            </div>
            <div class="noise-container">
                <div class="noise-fill" id="noiseFill"></div>
                <div class="noise-label" id="noiseLabel">${CONSTANTS.THRESHOLD_LABELS[defaultThreshold]}</div>
            </div>
            <div class="threshold-counter" id="thresholdCounter">Warnings: 0</div>
            <div class="timer-buttons">
                <button id="startNoise" onclick="NoiseMeterWidget.start()">Start Noise Meter</button>
                <button id="stopNoise" onclick="NoiseMeterWidget.stop()" style="display: none;">Stop Noise Meter</button>
                <button onclick="NoiseMeterWidget.resetCounter()">Reset Counter</button>
            </div>
        `;
    }
    
    /**
     * Initialize noise meter widgets
     */
    function init() {
        const containers = document.querySelectorAll('.noise-meter-widget');
        
        containers.forEach(container => {
            const defaultThreshold = parseInt(container.getAttribute('data-threshold'), 10) || CONSTANTS.DEFAULT_THRESHOLD;
            container.innerHTML = createNoiseMeterWidget(defaultThreshold);
        });
        
        // Cache DOM elements
        noiseFillEl = document.getElementById('noiseFill');
        noiseLabelEl = document.getElementById('noiseLabel');
        thresholdSlider = document.getElementById('noiseThreshold');
        thresholdCounter = document.getElementById('thresholdCounter');
        startBtn = document.getElementById('startNoise');
        stopBtn = document.getElementById('stopNoise');
        
        // Add event listener for threshold slider
        if (thresholdSlider) {
            thresholdSlider.addEventListener('input', updateThresholdLabel);
        }
    }
    
    // Public API
    return {
        init: init,
        start: startNoiseMeter,
        stop: stopNoiseMeter,
        resetCounter: resetThresholdCounter
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', NoiseMeterWidget.init);
