// Shared configuration for all classroom widgets
const ClassroomConfig = (function() {
    'use strict';
    
    return {
        // Theme colors
        COLORS: {
            PRIMARY: '#667eea',
            SECONDARY: '#764ba2',
            SUCCESS: '#2ecc71',
            WARNING: '#f39c12',
            DANGER: '#e74c3c',
            TEXT: '#333',
            TEXT_LIGHT: '#555',
            TEXT_PLACEHOLDER: '#999'
        },
        
        // Timer defaults
        TIMER: {
            DEFAULT_TIME: '05:00',
            DEFAULT_SECONDS: 300,
            ALARM_DURATION: 30000, // 30 seconds
            ALARM_INTERVAL: 600, // ms between alarm sounds
            ALARM_FREQUENCY: 1000, // Hz
            ALARM_SOUND_DURATION: 0.3, // seconds
            ALARM_GAIN: 0.5
        },
        
        // Noise meter defaults
        NOISE_METER: {
            FFT_SIZE: 512,
            SMOOTHING: 0.8,
            DING_COOLDOWN: 2000, // ms between dings
            DING_FREQUENCY: 1200, // Hz
            DING_DURATION: 1.5, // seconds
            THRESHOLDS: [15, 30, 50, 70, 90],
            THRESHOLD_LABELS: [
                '🤫 SILENT',
                '👥 PARTNER VOICE',
                '🗣️ GROUP VOICE',
                '📢 PRESENTATION VOICE',
                '📊 OUTSIDE VOICE'
            ],
            DEFAULT_THRESHOLD: 2,
            WARNING_MULTIPLIER: 0.7
        },
        
        // Random picker defaults
        RANDOM_PICKER: {
            STORAGE_KEY: 'randomPickerLists',
            MIN_FONT_SIZE: 16,
            MAX_FONT_SIZE: 120,
            FONT_STEP: 2,
            LINE_HEIGHT: 1.2,
            PADDING_OFFSET: 20
        },
        
        // Common animation settings
        ANIMATION: {
            TRANSITION_SPEED: '0.3s',
            FLASH_SPEED: '0.5s'
        }
    };
})();
