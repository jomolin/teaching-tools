// Timer Widget Module - Supports Multiple Instances
const TimerWidget = (function() {
    'use strict';
    
    // Use shared config if available, otherwise use defaults
    const CONSTANTS = typeof ClassroomConfig !== 'undefined' ? ClassroomConfig.TIMER : {
        DEFAULT_TIME: '05:00',
        DEFAULT_SECONDS: 300,
        ALARM_DURATION: 30000,
        ALARM_INTERVAL: 600,
        ALARM_FREQUENCY: 1000,
        ALARM_SOUND_DURATION: 0.3,
        ALARM_GAIN: 0.5
    };
    
    // Array to store all timer instances
    const instances = [];
    
    /**
     * Create a single timer instance
     */
    function createInstance(container, instanceId, defaultTime) {
        const instance = {
            id: instanceId,
            container: container,
            timerInterval: null,
            alarmInterval: null,
            alarmTimeout: null,
            timeRemaining: 0,
            isPaused: false,
            audioContext: null,
            defaultTimeValue: defaultTime,
            elements: {}
        };
        
        /**
         * Parse time display string into seconds
         */
        instance.parseTimeDisplay = function() {
            if (!instance.elements.timerDisplay) return CONSTANTS.DEFAULT_SECONDS;
            
            const displayText = instance.elements.timerDisplay.textContent.trim();
            const parts = displayText.split(':');
            
            if (parts.length === 2) {
                const mins = parseInt(parts[0], 10) || 0;
                const secs = parseInt(parts[1], 10) || 0;
                return (mins * 60) + secs;
            }
            return CONSTANTS.DEFAULT_SECONDS;
        };
        
        /**
         * Update timer display with current time
         */
        instance.updateTimerDisplay = function() {
            if (!instance.elements.timerDisplay) return;
            
            const mins = Math.floor(instance.timeRemaining / 60);
            const secs = instance.timeRemaining % 60;
            instance.elements.timerDisplay.textContent = 
                String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        };
        
        /**
         * Play a single alarm sound
         */
        instance.playAlarmSound = function() {
            if (!instance.audioContext) return;
            
            try {
                const oscillator = instance.audioContext.createOscillator();
                const gainNode = instance.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(instance.audioContext.destination);
                
                oscillator.frequency.value = CONSTANTS.ALARM_FREQUENCY;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(CONSTANTS.ALARM_GAIN, instance.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01, 
                    instance.audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION
                );
                
                oscillator.start(instance.audioContext.currentTime);
                oscillator.stop(instance.audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION);
            } catch (error) {
                console.error('Error playing alarm sound:', error);
            }
        };
        
        /**
         * Start the alarm sound loop
         */
        instance.startAlarm = function() {
            try {
                instance.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                instance.alarmInterval = setInterval(() => instance.playAlarmSound(), CONSTANTS.ALARM_INTERVAL);
                instance.alarmTimeout = setTimeout(() => instance.stopAlarm(), CONSTANTS.ALARM_DURATION);
            } catch (error) {
                console.error('Error starting alarm:', error);
                if (instance.elements.timerDisplay) {
                    instance.elements.timerDisplay.textContent = "TIME'S UP!";
                }
            }
        };
        
        /**
         * Stop the alarm and clean up
         */
        instance.stopAlarm = function() {
            clearInterval(instance.alarmInterval);
            clearTimeout(instance.alarmTimeout);
            
            if (instance.elements.stopAlarmBtn) {
                instance.elements.stopAlarmBtn.style.display = 'none';
            }
            
            if (instance.elements.timerDisplay) {
                instance.elements.timerDisplay.classList.remove('alarm');
            }
            
            if (instance.audioContext) {
                try {
                    instance.audioContext.close();
                    instance.audioContext = null;
                } catch (error) {
                    console.error('Error closing audio context:', error);
                }
            }
            
            instance.alarmInterval = null;
            instance.alarmTimeout = null;
        };
        
        /**
         * Start or resume the timer
         */
        instance.start = function() {
            if (!instance.elements.timerDisplay) return;
            
            if (!instance.isPaused) {
                instance.timeRemaining = instance.parseTimeDisplay();
            }
            instance.isPaused = false;
            
            clearInterval(instance.timerInterval);
            instance.timerInterval = setInterval(function() {
                if (instance.timeRemaining <= 0) {
                    clearInterval(instance.timerInterval);
                    instance.timerInterval = null;
                    
                    instance.elements.timerDisplay.textContent = "TIME'S UP!";
                    instance.elements.timerDisplay.classList.add('alarm');
                    instance.elements.timerDisplay.contentEditable = 'false';
                    
                    if (instance.elements.stopAlarmBtn) {
                        instance.elements.stopAlarmBtn.style.display = 'block';
                    }
                    
                    instance.startAlarm();
                    return;
                }
                
                instance.timeRemaining--;
                instance.updateTimerDisplay();
            }, 1000);
        };
        
        /**
         * Pause the timer
         */
        instance.pause = function() {
            clearInterval(instance.timerInterval);
            instance.timerInterval = null;
            instance.isPaused = true;
        };
        
        /**
         * Reset the timer to default time
         */
        instance.reset = function() {
            clearInterval(instance.timerInterval);
            instance.timerInterval = null;
            instance.stopAlarm();
            instance.isPaused = false;
            instance.timeRemaining = 0;
            
            if (instance.elements.timerDisplay) {
                instance.elements.timerDisplay.textContent = instance.defaultTimeValue;
                instance.elements.timerDisplay.style.color = '#667eea';
                instance.elements.timerDisplay.classList.remove('alarm');
                instance.elements.timerDisplay.contentEditable = 'true';
            }
        };
        
        return instance;
    }
    
    /**
     * Create timer widget HTML
     */
    function createTimerWidget(instanceId, defaultTime = CONSTANTS.DEFAULT_TIME) {
        return `
            <h2>Timer</h2>
            <div class="timer-display" id="timerDisplay-${instanceId}" contenteditable="true">${defaultTime}</div>
            <div class="timer-buttons">
                <button onclick="TimerWidget.start('${instanceId}')">Start</button>
                <button onclick="TimerWidget.pause('${instanceId}')">Pause</button>
                <button onclick="TimerWidget.reset('${instanceId}')">Reset</button>
                <button class="stop-alarm" id="stopAlarm-${instanceId}" onclick="TimerWidget.stopAlarm('${instanceId}')">STOP ALARM</button>
            </div>
        `;
    }
    
    /**
     * Get instance by ID
     */
    function getInstance(instanceId) {
        return instances.find(inst => inst.id === instanceId);
    }
    
    /**
     * Initialize timer widgets
     */
    function init() {
        const containers = document.querySelectorAll('.timer-widget');
        
        containers.forEach((container, index) => {
            // Create unique ID for this instance
            const instanceId = container.id || `timer-${index}`;
            const defaultTime = container.getAttribute('data-time') || CONSTANTS.DEFAULT_TIME;
            
            // Create instance
            const instance = createInstance(container, instanceId, defaultTime);
            instances.push(instance);
            
            // Add widget HTML
            container.innerHTML = createTimerWidget(instanceId, defaultTime);
            
            // Cache DOM elements for this instance
            instance.elements.timerDisplay = document.getElementById(`timerDisplay-${instanceId}`);
            instance.elements.stopAlarmBtn = document.getElementById(`stopAlarm-${instanceId}`);
        });
    }
    
    // Public API
    return {
        init: init,
        start: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.start();
        },
        pause: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.pause();
        },
        reset: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.reset();
        },
        stopAlarm: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.stopAlarm();
        }
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', TimerWidget.init);
