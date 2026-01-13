// Shared utility functions for classroom widgets
const ClassroomUtils = (function() {
    'use strict';
    
    return {
        /**
         * Safely close an audio context
         * @param {AudioContext} audioContext - The audio context to close
         */
        closeAudioContext: function(audioContext) {
            if (audioContext) {
                try {
                    audioContext.close();
                } catch (error) {
                    console.error('Error closing audio context:', error);
                }
            }
        },
        
        /**
         * Safely stop a media stream
         * @param {MediaStream} mediaStream - The media stream to stop
         */
        stopMediaStream: function(mediaStream) {
            if (mediaStream) {
                try {
                    mediaStream.getTracks().forEach(track => track.stop());
                } catch (error) {
                    console.error('Error stopping media stream:', error);
                }
            }
        },
        
        /**
         * Parse time string (MM:SS) into seconds
         * @param {string} timeString - Time in MM:SS format
         * @returns {number} Total seconds
         */
        parseTimeToSeconds: function(timeString) {
            const parts = timeString.trim().split(':');
            if (parts.length === 2) {
                const mins = parseInt(parts[0], 10) || 0;
                const secs = parseInt(parts[1], 10) || 0;
                return (mins * 60) + secs;
            }
            return 0;
        },
        
        /**
         * Format seconds into MM:SS string
         * @param {number} totalSeconds - Total seconds
         * @returns {string} Time in MM:SS format
         */
        formatSecondsToTime: function(totalSeconds) {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        },
        
        /**
         * Safely parse JSON with error handling
         * @param {string} jsonString - JSON string to parse
         * @param {*} fallback - Fallback value if parsing fails
         * @returns {*} Parsed object or fallback
         */
        safeParseJSON: function(jsonString, fallback = {}) {
            try {
                return JSON.parse(jsonString);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return fallback;
            }
        },
        
        /**
         * Safely stringify JSON with error handling
         * @param {*} data - Data to stringify
         * @param {string} fallback - Fallback string if stringify fails
         * @returns {string} JSON string or fallback
         */
        safeStringifyJSON: function(data, fallback = '{}') {
            try {
                return JSON.stringify(data);
            } catch (error) {
                console.error('Error stringifying JSON:', error);
                return fallback;
            }
        },
        
        /**
         * Safely get from localStorage with JSON parsing
         * @param {string} key - localStorage key
         * @param {*} fallback - Fallback value if key doesn't exist or parsing fails
         * @returns {*} Parsed value or fallback
         */
        getFromStorage: function(key, fallback = null) {
            try {
                const stored = localStorage.getItem(key);
                if (stored === null) return fallback;
                return JSON.parse(stored);
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return fallback;
            }
        },
        
        /**
         * Safely save to localStorage with JSON stringification
         * @param {string} key - localStorage key
         * @param {*} value - Value to save
         * @returns {boolean} Success status
         */
        saveToStorage: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error saving to localStorage:', error);
                return false;
            }
        },
        
        /**
         * Debounce function calls
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        /**
         * Download data as a file
         * @param {string} data - Data to download
         * @param {string} filename - Name of the file
         * @param {string} type - MIME type
         */
        downloadFile: function(data, filename, type = 'application/json') {
            try {
                const blob = new Blob([data], { type: type });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error downloading file:', error);
                alert('Error downloading file. Please try again.');
            }
        },
        
        /**
         * Create an audio oscillator with gain
         * @param {AudioContext} audioContext - Audio context to use
         * @param {number} frequency - Frequency in Hz
         * @param {string} type - Oscillator type (sine, square, etc.)
         * @param {number} duration - Duration in seconds
         * @param {number} gain - Gain value (0-1)
         * @returns {Object|null} Object with oscillator and gainNode, or null on error
         */
        createAudioTone: function(audioContext, frequency, type, duration, gain) {
            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
                
                return { oscillator, gainNode };
            } catch (error) {
                console.error('Error creating audio tone:', error);
                return null;
            }
        },
        
        /**
         * Show/hide modal with Tailwind classes
         * @param {HTMLElement} modalElement - The modal element
         * @param {boolean} show - Whether to show or hide
         */
        toggleModal: function(modalElement, show) {
            if (!modalElement) return;
            
            if (show) {
                modalElement.classList.remove('hidden');
                modalElement.classList.add('flex');
            } else {
                modalElement.classList.add('hidden');
                modalElement.classList.remove('flex');
            }
        }
    };
})();