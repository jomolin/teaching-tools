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
            '💬 PARTNER VOICE',
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
                ClassroomUtils.closeAudioContext(audioCtx);
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
            
            // Change color based on level - KEEP THIS FUNCTIONALITY
            if (percentage > threshold) {
                noiseFillEl.style.background = '#ef4444'; // red-500
                
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
                noiseFillEl.style.background = '#f59e0b'; // amber-500
            } else {
                noiseFillEl.style.background = '#10b981'; // emerald-500
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
            
            if (startBtn) startBtn.classList.add('hidden');
            if (stopBtn) stopBtn.classList.remove('hidden');
            
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
        ClassroomUtils.closeAudioContext(audioContext);
        audioContext = null;
        
        // Stop media stream tracks
        ClassroomUtils.stopMediaStream(mediaStream);
        mediaStream = null;
        
        analyser = null;
        
        // Reset UI
        if (noiseFillEl) noiseFillEl.style.width = '0%';
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
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
     * Create noise meter widget HTML with Tailwind classes
     */
    function createNoiseMeterWidget(defaultThreshold = CONSTANTS.DEFAULT_THRESHOLD) {
        return `
            <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 shadow-md flex flex-col h-full">
                <h2 class="text-primary dark:text-blue-400 mb-4 text-2xl font-semibold">Noise Meter</h2>
                
                <div class="my-4">
                    <input type="range" 
                           id="noiseThreshold" 
                           min="0" 
                           max="4" 
                           value="${defaultThreshold}" 
                           step="1"
                           class="w-full h-2 rounded bg-gray-200 dark:bg-gray-700 outline-none cursor-pointer">
                </div>
                
                <div class="relative h-24 bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden my-5">
                    <div id="noiseFill" 
                         class="absolute bottom-0 left-0 h-full transition-all duration-100"
                         style="width: 0%; background: #10b981;"></div>
                    <div id="noiseLabel" 
                         class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-gray-900 dark:text-gray-100 z-10">${CONSTANTS.THRESHOLD_LABELS[defaultThreshold]}</div>
                </div>
                
                <div id="thresholdCounter" 
                     class="text-center text-gray-600 dark:text-gray-400 text-base my-2.5">
                    Warnings: 0
                </div>
                
                <div class="flex gap-2.5 justify-center flex-wrap mt-auto">
                    <button id="startNoise" 
                            onclick="NoiseMeterWidget.start()"
                            class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                        Start Monitoring
                    </button>
                    <button id="stopNoise" 
                            onclick="NoiseMeterWidget.stop()"
                            class="hidden bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                        Stop
                    </button>
                    <button onclick="NoiseMeterWidget.resetCounter()"
                            class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                        Reset Counter
                    </button>
                </div>
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