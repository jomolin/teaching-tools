// Timer Widget Module
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
    
    // Module state
    let timerInterval = null;
    let alarmInterval = null;
    let alarmTimeout = null;
    let timeRemaining = 0;
    let isPaused = false;
    let audioContext = null;
    let defaultTimeValue = CONSTANTS.DEFAULT_TIME;
    
    // DOM element cache
    let timerDisplay = null;
    let stopAlarmBtn = null;
    
    /**
     * Parse time display string into seconds
     */
    function parseTimeDisplay() {
        if (!timerDisplay) return CONSTANTS.DEFAULT_SECONDS;
        
        const displayText = timerDisplay.textContent.trim();
        const parts = displayText.split(':');
        
        if (parts.length === 2) {
            const mins = parseInt(parts[0], 10) || 0;
            const secs = parseInt(parts[1], 10) || 0;
            return (mins * 60) + secs;
        }
        return CONSTANTS.DEFAULT_SECONDS;
    }
    
    /**
     * Update timer display with current time
     */
    function updateTimerDisplay() {
        if (!timerDisplay) return;
        
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        timerDisplay.textContent = 
            String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }
    
    /**
     * Play a single alarm sound
     */
    function playAlarmSound() {
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = CONSTANTS.ALARM_FREQUENCY;
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(CONSTANTS.ALARM_GAIN, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, 
                audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION
            );
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + CONSTANTS.ALARM_SOUND_DURATION);
        } catch (error) {
            console.error('Error playing alarm sound:', error);
        }
    }
    
    /**
     * Start the alarm sound loop
     */
    function startAlarm() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            alarmInterval = setInterval(playAlarmSound, CONSTANTS.ALARM_INTERVAL);
            alarmTimeout = setTimeout(stopAlarm, CONSTANTS.ALARM_DURATION);
        } catch (error) {
            console.error('Error starting alarm:', error);
            if (timerDisplay) {
                timerDisplay.textContent = "TIME'S UP!";
            }
        }
    }
    
    /**
     * Stop the alarm and clean up
     */
    function stopAlarm() {
        clearInterval(alarmInterval);
        clearTimeout(alarmTimeout);
        
        if (stopAlarmBtn) {
            stopAlarmBtn.style.display = 'none';
        }
        
        if (timerDisplay) {
            timerDisplay.classList.remove('alarm');
        }
        
        if (audioContext) {
            try {
                audioContext.close();
                audioContext = null;
            } catch (error) {
                console.error('Error closing audio context:', error);
            }
        }
        
        alarmInterval = null;
        alarmTimeout = null;
    }
    
    /**
     * Start or resume the timer
     */
    function startTimer() {
        if (!timerDisplay) return;
        
        if (!isPaused) {
            timeRemaining = parseTimeDisplay();
        }
        isPaused = false;
        
        clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                
                timerDisplay.textContent = "TIME'S UP!";
                timerDisplay.classList.add('alarm');
                timerDisplay.contentEditable = 'false';
                
                if (stopAlarmBtn) {
                    stopAlarmBtn.style.display = 'block';
                }
                
                startAlarm();
                return;
            }
            
            timeRemaining--;
            updateTimerDisplay();
        }, 1000);
    }
    
    /**
     * Pause the timer
     */
    function pauseTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
    }
    
    /**
     * Reset the timer to default time
     */
    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        stopAlarm();
        isPaused = false;
        timeRemaining = 0;
        
        if (timerDisplay) {
            timerDisplay.textContent = defaultTimeValue;
            timerDisplay.style.color = '#667eea';
            timerDisplay.classList.remove('alarm');
            timerDisplay.contentEditable = 'true';
        }
    }
    
    /**
     * Create timer widget HTML
     */
    function createTimerWidget(defaultTime = CONSTANTS.DEFAULT_TIME) {
        return `
            <h2>Timer</h2>
            <div class="timer-display" id="timerDisplay" contenteditable="true">${defaultTime}</div>
            <div class="timer-buttons">
                <button onclick="TimerWidget.start()">Start</button>
                <button onclick="TimerWidget.pause()">Pause</button>
                <button onclick="TimerWidget.reset()">Reset</button>
                <button class="stop-alarm" id="stopAlarm" onclick="TimerWidget.stopAlarm()">STOP ALARM</button>
            </div>
        `;
    }
    
    /**
     * Initialize timer widgets
     */
    function init() {
        const containers = document.querySelectorAll('.timer-widget');
        
        containers.forEach(container => {
            const defaultTime = container.getAttribute('data-time') || CONSTANTS.DEFAULT_TIME;
            defaultTimeValue = defaultTime;
            container.innerHTML = createTimerWidget(defaultTime);
        });
        
        // Cache DOM elements
        timerDisplay = document.getElementById('timerDisplay');
        stopAlarmBtn = document.getElementById('stopAlarm');
    }
    
    // Public API
    return {
        init: init,
        start: startTimer,
        pause: pauseTimer,
        reset: resetTimer,
        stopAlarm: stopAlarm,
        // Expose for custom reset overrides
        setDefaultTime: function(time) {
            defaultTimeValue = time;
        }
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', TimerWidget.init);