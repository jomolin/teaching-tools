// Seven Pickers Widget Module - For Heads Up 7-Up
const SevenPickersWidget = (function() {
    'use strict';

    const CONSTANTS = {
        STORAGE_KEY: 'sevenPickersState',
        STUDENT_LIST_KEY: 'sevenPickersStudentList',
        RANDOM_PICKER_STORAGE: 'randomPickerLists',
        DEFAULT_LIST: 'Students 2025',
        NUM_PICKERS: 7
    };

    // Widget state
    let pickerStates = [];
    let studentList = [];
    let containerElement = null;

    /**
     * Load student list - try multiple sources
     */
    function loadStudentList() {
        try {
            // First, try to load from our own storage
            let stored = localStorage.getItem(CONSTANTS.STUDENT_LIST_KEY);
            if (stored) {
                studentList = JSON.parse(stored);
                console.log('Loaded student list from seven-pickers storage');
                return;
            }

            // Second, try to load from random picker storage
            stored = localStorage.getItem(CONSTANTS.RANDOM_PICKER_STORAGE);
            if (stored) {
                const lists = JSON.parse(stored);
                studentList = lists[CONSTANTS.DEFAULT_LIST] || [];
                if (studentList.length > 0) {
                    console.log('Loaded student list from random picker storage');
                    saveStudentList(); // Save to our own storage for next time
                    return;
                }
            }

            console.log('No student list found');
            studentList = [];
        } catch (error) {
            console.error('Error loading student list:', error);
            studentList = [];
        }
    }

    /**
     * Save student list to localStorage
     */
    function saveStudentList() {
        try {
            localStorage.setItem(CONSTANTS.STUDENT_LIST_KEY, JSON.stringify(studentList));
        } catch (error) {
            console.error('Error saving student list:', error);
        }
    }

    /**
     * Load saved picker states from localStorage
     */
    function loadPickerStates() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
            if (stored) {
                pickerStates = JSON.parse(stored);
                // Ensure we have exactly 7 pickers
                while (pickerStates.length < CONSTANTS.NUM_PICKERS) {
                    pickerStates.push({ name: '', locked: false });
                }
            } else {
                // Initialize empty pickers
                pickerStates = Array(CONSTANTS.NUM_PICKERS).fill(null).map(() => ({
                    name: '',
                    locked: false
                }));
            }
        } catch (error) {
            console.error('Error loading picker states:', error);
            pickerStates = Array(CONSTANTS.NUM_PICKERS).fill(null).map(() => ({
                name: '',
                locked: false
            }));
        }
    }

    /**
     * Save picker states to localStorage
     */
    function savePickerStates() {
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(pickerStates));
        } catch (error) {
            console.error('Error saving picker states:', error);
        }
    }

    /**
     * Get available students (not already picked and not locked)
     */
    function getAvailableStudents() {
        const lockedNames = pickerStates
        .filter(p => p.locked && p.name)
        .map(p => p.name);

        return studentList.filter(name => !lockedNames.includes(name));
    }

    /**
     * Randomize unlocked pickers
     */
    function randomizeUnlocked() {
        if (studentList.length === 0) {
            alert('No students in list! Click "Edit Student List" to add students.');
            return;
        }

        const available = getAvailableStudents();
        const unlockedIndices = pickerStates
        .map((p, i) => p.locked ? -1 : i)
        .filter(i => i >= 0);

        if (available.length < unlockedIndices.length) {
            alert('Not enough students available to fill all unlocked slots!');
            return;
        }

        // Shuffle available students
        const shuffled = [...available].sort(() => Math.random() - 0.5);

        // Assign to unlocked pickers
        unlockedIndices.forEach((index, i) => {
            pickerStates[index].name = shuffled[i];
        });

        savePickerStates();
        renderPickers();
    }

    /**
     * Toggle lock on a picker
     */
    function toggleLock(index) {
        pickerStates[index].locked = !pickerStates[index].locked;
        savePickerStates();
        renderPickers();
    }

    /**
     * Update picker name manually
     */
    function updatePickerName(index, name) {
        pickerStates[index].name = name;
        savePickerStates();
    }

    /**
     * Clear all pickers
     */
    function clearAll() {
        if (confirm('Clear all 7 pickers?')) {
            pickerStates = Array(CONSTANTS.NUM_PICKERS).fill(null).map(() => ({
                name: '',
                locked: false
            }));
            savePickerStates();
            renderPickers();
        }
    }

    /**
     * Open student list editor
     */
    function openStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        const textarea = containerElement.querySelector('#studentListTextarea');

        if (modal && textarea) {
            textarea.value = studentList.join('\n');
            modal.style.display = 'flex';
        }
    }

    /**
     * Close student list editor
     */
    function closeStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Save student list from editor
     */
    function saveStudentListFromEditor() {
        const textarea = containerElement.querySelector('#studentListTextarea');
        if (textarea) {
            const text = textarea.value;
            studentList = text.split('\n')
            .map(s => s.trim())
            .filter(s => s !== '');

            saveStudentList();
            closeStudentEditor();
            alert(`Saved ${studentList.length} students!`);
        }
    }

    /**
     * Render the pickers
     */
    function renderPickers() {
        if (!containerElement) return;

        const pickersHTML = pickerStates.map((picker, index) => `
        <div class="picker-slot ${picker.locked ? 'locked' : ''}">
        <div class="picker-number">${index + 1}</div>
        <input
        type="text"
        class="picker-input"
        value="${picker.name}"
        placeholder="Empty"
        onchange="SevenPickersWidget.updateName(${index}, this.value)"
        >
        <button
        class="lock-button ${picker.locked ? 'locked' : ''}"
        onclick="SevenPickersWidget.toggleLock(${index})"
        title="${picker.locked ? 'Unlock' : 'Lock'}"
        >
        ${picker.locked ? '🔒' : '🔓'}
        </button>
        </div>
        `).join('');

        containerElement.querySelector('.pickers-grid').innerHTML = pickersHTML;
    }

    /**
     * Create widget HTML
     */
    function createWidgetHTML() {
        return `
        <h2>The 7 Pickers</h2>
        <div class="pickers-grid"></div>
        <div class="timer-buttons" style="margin-top: 15px;">
        <button onclick="SevenPickersWidget.randomize()">🎲 Pick 7 Random</button>
        <button onclick="SevenPickersWidget.openEditor()">📝 Edit Student List</button>
        <button onclick="SevenPickersWidget.clearAll()" style="background: #e74c3c;">Clear All</button>
        </div>

        <div id="studentListModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; align-items: center; justify-content: center;">
        <div class="modal-overlay" onclick="SevenPickersWidget.closeEditor()"></div>
        <div class="modal-content">
        <h2>Edit Student List</h2>
        <p style="color: #666; margin-bottom: 10px;">Enter one student name per line:</p>
        <textarea id="studentListTextarea" placeholder="Student 1&#10;Student 2&#10;Student 3&#10;..." style="width: 100%; height: 300px; padding: 10px; font-size: 16px; border: 2px solid #667eea; border-radius: 8px; font-family: Arial, sans-serif;"></textarea>
        <div class="timer-buttons" style="margin-top: 15px;">
        <button onclick="SevenPickersWidget.saveStudentList()">💾 Save Student List</button>
        <button onclick="SevenPickersWidget.closeEditor()">Cancel</button>
        </div>
        </div>
        </div>
        `;
    }

    /**
     * Initialize the widget
     */
    function init() {
        containerElement = document.querySelector('.seven-pickers-widget');
        if (!containerElement) return;

        loadStudentList();
        loadPickerStates();

        containerElement.innerHTML = createWidgetHTML();
        renderPickers();

        // Show warning if no students
        if (studentList.length === 0) {
            setTimeout(() => {
                alert('No student list found! Click "Edit Student List" to add your students.');
            }, 500);
        }
    }

    // Public API
    return {
        init: init,
        randomize: randomizeUnlocked,
        toggleLock: toggleLock,
        updateName: updatePickerName,
        clearAll: clearAll,
        openEditor: openStudentEditor,
        closeEditor: closeStudentEditor,
        saveStudentList: saveStudentListFromEditor
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', SevenPickersWidget.init);
