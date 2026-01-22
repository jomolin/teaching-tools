// Simple Timer Widget Module - Minimal timer with click-to-edit functionality
const SimpleTimerWidget = (function() {
    'use strict';
    
    const CONSTANTS = typeof ClassroomConfig !== 'undefined' ? ClassroomConfig.TIMER : {
        DEFAULT_TIME: '20:00',
        DEFAULT_SECONDS: 1200,
        ALARM_DURATION: 30000,
        ALARM_INTERVAL: 600,
        ALARM_FREQUENCY: 1000,
        ALARM_SOUND_DURATION: 0.3,
        ALARM_GAIN: 0.5
    };
    
    const instances = [];
    
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
            isEditing: false,
            elements: {}
        };
        
        // Parse time display string into seconds
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
        
        // Update timer display with current time
        instance.updateTimerDisplay = function() {
            if (!instance.elements.timerDisplay || instance.isEditing) return;
            
            const mins = Math.floor(instance.timeRemaining / 60);
            const secs = instance.timeRemaining % 60;
            instance.elements.timerDisplay.textContent = 
                String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        };
        
        // Start editing the timer
        instance.startEditing = function() {
            if (instance.isPaused === false) return; // Don't allow editing while running
            
            instance.isEditing = true;
            const currentTime = instance.elements.timerDisplay.textContent;
            instance.elements.timerDisplay.contentEditable = 'true';
            instance.elements.timerDisplay.focus();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(instance.elements.timerDisplay);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };
        
        // Finish editing the timer
        instance.finishEditing = function() {
            instance.isEditing = false;
            instance.elements.timerDisplay.contentEditable = 'false';
            
            // Parse the new time
            const newTime = instance.elements.timerDisplay.textContent.trim();
            const parts = newTime.split(':');
            
            if (parts.length === 2) {
                const mins = parseInt(parts[0], 10) || 0;
                const secs = parseInt(parts[1], 10) || 0;
                instance.timeRemaining = (mins * 60) + secs;
            }
            
            // Update display to ensure proper formatting
            instance.updateTimerDisplay();
        };
        
        // Play a single alarm sound
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
                gainNode.gain.exponentialRampToValueAtTime(0.01, instance.audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION);
                
                oscillator.start(instance.audioContext.currentTime);
                oscillator.stop(instance.audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION);
            } catch (error) {
                console.error('Error playing alarm sound:', error);
            }
        };
        
        // Start the alarm loop
        instance.startAlarm = function() {
            if (!instance.audioContext) {
                instance.audioContext = ClassroomUtils.createAudioContext();
            }
            
            // Play immediately
            instance.playAlarmSound();
            
            // Loop for duration
            instance.alarmInterval = setInterval(() => {
                instance.playAlarmSound();
            }, CONSTANTS.ALARM_INTERVAL);
            
            // Stop after duration
            instance.alarmTimeout = setTimeout(() => {
                instance.stopAlarm();
            }, CONSTANTS.ALARM_DURATION);
            
            // Show disable button
            instance.elements.disableAlarmBtn.classList.remove('hidden');
        };
        
        // Stop the alarm
        instance.stopAlarm = function() {
            if (instance.alarmInterval) {
                clearInterval(instance.alarmInterval);
                instance.alarmInterval = null;
            }
            if (instance.alarmTimeout) {
                clearTimeout(instance.alarmTimeout);
                instance.alarmTimeout = null;
            }
            instance.elements.disableAlarmBtn.classList.add('hidden');
        };
        
        // Start timer
        instance.start = function() {
            if (!instance.isPaused) return;
            
            instance.isPaused = false;
            instance.elements.startBtn.classList.add('hidden');
            instance.elements.pauseBtn.classList.remove('hidden');
            
            instance.timerInterval = setInterval(() => {
                if (instance.timeRemaining > 0) {
                    instance.timeRemaining--;
                    instance.updateTimerDisplay();
                } else {
                    instance.pause();
                    instance.startAlarm();
                }
            }, 1000);
        };
        
        // Pause timer
        instance.pause = function() {
            if (instance.isPaused) return;
            
            instance.isPaused = true;
            clearInterval(instance.timerInterval);
            instance.elements.startBtn.classList.remove('hidden');
            instance.elements.pauseBtn.classList.add('hidden');
        };
        
        // Reset timer
        instance.reset = function() {
            instance.pause();
            instance.stopAlarm();
            instance.timeRemaining = instance.parseTimeDisplay();
            instance.updateTimerDisplay();
        };
        
        // Render the widget
        instance.render = function() {
            this.container.innerHTML = `
                <div class="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-4 shadow-sm h-full flex flex-col items-center justify-center">
                    <div class="text-5xl font-mono font-bold mb-3 cursor-pointer hover:text-primary dark:hover:text-blue-400 transition-colors" id="timer-display">${this.defaultTimeValue}</div>
                    <div class="flex gap-2">
                        <button id="start-btn" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">Start</button>
                        <button id="pause-btn" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors hidden">Pause</button>
                        <button id="reset-btn" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">Reset</button>
                    </div>
                    <button id="disable-alarm-btn" class="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors hidden">Disable Alarm</button>
                </div>
            `;
            
            // Store element references
            this.elements.timerDisplay = this.container.querySelector('#timer-display');
            this.elements.startBtn = this.container.querySelector('#start-btn');
            this.elements.pauseBtn = this.container.querySelector('#pause-btn');
            this.elements.resetBtn = this.container.querySelector('#reset-btn');
            this.elements.disableAlarmBtn = this.container.querySelector('#disable-alarm-btn');
            
            // Initialize state
            this.timeRemaining = this.parseTimeDisplay();
            this.isPaused = true;
            
            // Attach event listeners
            this.elements.timerDisplay.addEventListener('click', () => this.startEditing());
            this.elements.timerDisplay.addEventListener('blur', () => this.finishEditing());
            this.elements.timerDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.elements.timerDisplay.blur();
                }
            });
            this.elements.startBtn.addEventListener('click', () => this.start());
            this.elements.pauseBtn.addEventListener('click', () => this.pause());
            this.elements.resetBtn.addEventListener('click', () => this.reset());
            this.elements.disableAlarmBtn.addEventListener('click', () => this.stopAlarm());
        };
        
        // Initialize
        instance.render();
        
        return instance;
    }
    
    return {
        init: function() {
            const containers = document.querySelectorAll('.simple-timer-widget');
            containers.forEach((container, index) => {
                const defaultTime = container.dataset.time || CONSTANTS.DEFAULT_TIME;
                const instanceId = `simple-timer-${index}`;
                const instance = createInstance(container, instanceId, defaultTime);
                instances.push(instance);
            });
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SimpleTimerWidget.init);
} else {
    SimpleTimerWidget.init();
}