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
                instance.elements.stopAlarmBtn.classList.add('hidden');
            }
            
            if (instance.elements.timerDisplay) {
                instance.elements.timerDisplay.classList.remove('animate-pulse', 'bg-red-500', 'text-white');
            }
            
            if (instance.audioContext) {
                ClassroomUtils.closeAudioContext(instance.audioContext);
                instance.audioContext = null;
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
                    instance.elements.timerDisplay.classList.add('animate-pulse', 'bg-red-500', 'text-white');
                    instance.elements.timerDisplay.contentEditable = 'false';
                    
                    if (instance.elements.stopAlarmBtn) {
                        instance.elements.stopAlarmBtn.classList.remove('hidden');
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
                instance.elements.timerDisplay.classList.remove('animate-pulse', 'bg-red-500', 'text-white');
                instance.elements.timerDisplay.contentEditable = 'true';
            }
        };
        
        return instance;
    }
    
    /**
     * Create timer widget HTML
     * Uses design doc standard: bg-white dark:bg-gray-800, text-blue-600 dark:text-blue-400
     */
function createTimerWidget(instanceId, defaultTime = CONSTANTS.DEFAULT_TIME, showTitle = false) {
        return `
            <div class="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col h-full">
                ${showTitle ? '<h2 class="text-blue-600 dark:text-blue-400 mb-4 text-2xl font-semibold">Timer</h2>' : ''}
                
                <div id="timerDisplay-${instanceId}" 
                     contenteditable="true"
                     class="text-center text-blue-600 dark:text-blue-400 font-bold my-5 border-2 border-transparent p-2.5 rounded-lg cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-50 dark:focus:bg-gray-900"
                >${defaultTime}</div>
                
                <div class="flex gap-2.5 justify-center flex-wrap mt-auto">
                    <button onclick="TimerWidget.start('${instanceId}')"
                            class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        Start
                    </button>
                    <button onclick="TimerWidget.pause('${instanceId}')"
                            class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        Pause
                    </button>
                    <button onclick="TimerWidget.reset('${instanceId}')"
                            class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        Reset
                    </button>
                    <button id="stopAlarm-${instanceId}" 
                            onclick="TimerWidget.stopAlarm('${instanceId}')"
                            class="hidden bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        STOP ALARM
                    </button>
                </div>
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
     * Scale the timer display font to fit its container.
     * Called on render and on resize. Uses the same shrink-to-fit approach as
     * random-picker.
     */
    function fitTimerDisplay(displayElement) {
        if (!displayElement) return;
        const wrapper = displayElement.parentElement;
        if (!wrapper) return;

        // Available space for the digit display, leaving room for the header
        // and button row above and below it.
        const availW = wrapper.clientWidth - 20;  // account for padding
        const availH = displayElement.parentElement.clientHeight * 0.5; // half the card
        if (availW <= 0 || availH <= 0) return;

        // Start large and shrink until it fits
        const MIN = 24;
        const MAX = 180;
        const STEP = 4;
        let fontSize = MAX;
        displayElement.style.fontSize = fontSize + 'px';
        displayElement.style.lineHeight = '1.1';

        while (fontSize > MIN &&
               (displayElement.scrollWidth > availW || displayElement.scrollHeight > availH)) {
            fontSize -= STEP;
            displayElement.style.fontSize = fontSize + 'px';
        }
    }

    /**
     * Find which instance owns a given DOM container element
     */
    function findInstanceByContainer(container) {
        return instances.find(inst => inst.container === container);
    }
    
    /**
     * Initialize timer widgets
     */
    function init() {
        const containers = document.querySelectorAll('.timer-widget');
        
        containers.forEach((container, index) => {
            if (container.dataset.initialized === 'true') return;

            // Create unique ID for this instance
            const instanceId = container.id || `timer-${index}`;
            const defaultTime = container.getAttribute('data-time') || CONSTANTS.DEFAULT_TIME;
            const showTitle = container.getAttribute('data-show-title') === 'true';

            // Create instance
            const instance = createInstance(container, instanceId, defaultTime);
            instances.push(instance);
            
            // Add widget HTML
            container.innerHTML = createTimerWidget(instanceId, defaultTime);
            
            // Cache DOM elements for this instance
            instance.elements.timerDisplay = document.getElementById(`timerDisplay-${instanceId}`);
            instance.elements.stopAlarmBtn = document.getElementById(`stopAlarm-${instanceId}`);
            container.dataset.initialized = 'true';
            
            // Initial font fit (rAF so the browser commits dimensions first)
            requestAnimationFrame(() => fitTimerDisplay(instance.elements.timerDisplay));
        });
    }
    
    // Public API
    return {
        init: init,
        // Canvas calls this when a tile is resized
        onResize: function(container) {
            const instance = findInstanceByContainer(container);
            if (!instance) return;
            requestAnimationFrame(() => fitTimerDisplay(instance.elements.timerDisplay));
        },
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

// Expose on window so the canvas controller can re-trigger init()
window.TimerWidget = TimerWidget;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', TimerWidget.init);