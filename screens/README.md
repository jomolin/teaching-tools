# Classroom Screens

A collection of interactive classroom management tools and games built with vanilla JavaScript.

## Features

- **Timer Widget** - Countdown timer with visual and audio alarms
- **Noise Meter Widget** - Real-time classroom noise monitoring with configurable thresholds
- **Random Picker Widget** - Random student/item selector with list management
- **Title Widget** - Customizable message and instructions display

## Project Structure

```
classroom-screens/
├── index.html              # Hub page with links to all screens
├── config.js               # Shared configuration for all widgets
├── utils.js                # Shared utility functions
├── styles.css              # Global styles
├── data/
│   └── random-picker-lists.json  # Pre-loaded lists for random picker
├── screens/
│   ├── classroom.html      # Full classroom display
│   ├── ssr.html           # Silent reading mode
│   ├── silent-ball.html   # Silent ball game
│   └── reverse-charades.html  # Reverse charades game
└── widgets/
    ├── timer.js           # Timer widget
    ├── noise-meter.js     # Noise meter widget
    ├── random-picker.js   # Random picker widget
    └── title.js           # Title widget
```

## Screens

### Full Classroom
Complete classroom display with timer, random picker, and noise meter.

### SSR (Silent Sustained Reading)
Timer and noise meter configured for quiet reading time (15 min default).

### Silent Ball
Brain break game with timer and noise monitoring.

### Reverse Charades
Group game with timer and two random pickers (students and prompts).

## Widget API

### TimerWidget

```javascript
TimerWidget.start()          // Start/resume timer
TimerWidget.pause()          // Pause timer
TimerWidget.reset()          // Reset to default time
TimerWidget.stopAlarm()      // Stop alarm sound
TimerWidget.setDefaultTime('10:00')  // Set default time
```

### NoiseMeterWidget

```javascript
NoiseMeterWidget.start()        // Start noise monitoring
NoiseMeterWidget.stop()         // Stop noise monitoring
NoiseMeterWidget.resetCounter() // Reset warning counter
```

### RandomPickerWidget

The Random Picker Widget supports multiple independent instances on the same page. Each instance has its own state, modal, and can load different lists.

```javascript
// All methods require an instanceId (the widget's HTML id attribute)
RandomPickerWidget.pick(instanceId)       // Pick random item
RandomPickerWidget.reset(instanceId)      // Reset picker
RandomPickerWidget.openModal(instanceId)  // Open list editor
RandomPickerWidget.closeModal(instanceId) // Close list editor
RandomPickerWidget.saveList(instanceId)   // Save current list
RandomPickerWidget.loadList(instanceId)   // Load saved list
RandomPickerWidget.deleteList(instanceId) // Delete saved list
RandomPickerWidget.exportLists(instanceId) // Export all lists to JSON
RandomPickerWidget.importLists(instanceId) // Import lists from JSON
```

**Multiple Instances Example:**
```html
<!-- Student picker -->
<div class="random-picker-widget widget" 
     id="studentPicker" 
     data-title="Student Picker"></div>

<!-- Prompt picker -->
<div class="random-picker-widget widget" 
     id="promptPicker" 
     data-title="Prompt Picker"></div>
```

Each picker maintains its own:
- Selected items and remaining count
- Modal dialog for editing lists
- Access to shared saved lists (all pickers can load the same saved lists)
- Independent state (picking from one doesn't affect the other)

## Configuration

Edit `config.js` to customize:
- Colors and theme
- Timer defaults and alarm settings
- Noise meter thresholds and labels
- Random picker font sizes
- Animation speeds

## Browser Requirements

- Modern browser with ES6+ support
- Microphone access for noise meter
- LocalStorage for saving random picker lists

## Usage

1. Open `index.html` in a web browser
2. Click on any screen to launch it
3. Interact with widgets as needed

### Creating Custom Screens

1. Create a new HTML file in `screens/`
2. Include required widget scripts:
```html
<link rel="stylesheet" href="../styles.css">
<script src="../config.js"></script>
<script src="../widgets/title.js"></script>
<script src="../widgets/timer.js"></script>
<!-- Add other widgets as needed -->
```
3. Add widget containers with appropriate classes:
```html
<!-- Timer with custom default time -->
<div class="timer-widget widget" data-time="05:00"></div>

<!-- Noise meter with custom threshold (0-4) -->
<div class="noise-meter-widget widget" data-threshold="2"></div>

<!-- Single random picker -->
<div class="random-picker-widget widget"></div>

<!-- Multiple random pickers with custom titles -->
<div class="random-picker-widget widget" 
     id="studentPicker" 
     data-title="Student Picker"></div>
<div class="random-picker-widget widget" 
     id="promptPicker" 
     data-title="Prompt Picker"></div>

<!-- Title widget with custom content -->
<div class="title-widget widget" 
     data-title="My Screen" 
     data-instructions="<ol><li>Step 1</li><li>Step 2</li></ol>">
</div>
```

**Important Notes:**
- Random picker widgets need unique `id` attributes when using multiple on the same page
- Use `data-title` attribute to customize the heading of each random picker
- Timer default time is in MM:SS format
- Noise meter threshold ranges from 0 (silent) to 4 (outside voice)

## Development Notes

- All widgets use the module pattern to avoid global scope pollution
- Proper error handling for audio/microphone access
- Resource cleanup prevents memory leaks
- DOM elements cached on initialization
- Constants centralized in config.js
- Random Picker Widget supports multiple independent instances on the same page
  - Each instance maintains its own state and modal
  - All instances share access to saved lists in localStorage
  - Instance IDs are auto-generated or can be specified via HTML id attribute

## License

Free to use for educational purposes.
