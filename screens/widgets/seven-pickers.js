// Seven Pickers Widget Module - For Heads Up 7-Up
const SevenPickersWidget = (function() {
    'use strict';

    const CONSTANTS = {
        STORAGE_KEY: 'sevenPickersState',
        SELECTED_LIST_KEY: 'sevenPickersSelectedList',
        RANDOM_PICKER_STORAGE: 'randomPickerLists',
        DEFAULT_LIST: 'Students 2026',
        NUM_PICKERS: 7
    };

    // Widget state
    let pickerStates = [];
    let studentList = [];
    let selectedListName = '';
    let containerElement = null;

    /**
     * Load student list from random picker storage based on selected list
     */
    function loadStudentList() {
        // Load which list was last selected
        selectedListName = ClassroomUtils.getFromStorage(CONSTANTS.SELECTED_LIST_KEY, CONSTANTS.DEFAULT_LIST);
        
        // Load all lists from random picker storage
        const lists = ClassroomUtils.getFromStorage(CONSTANTS.RANDOM_PICKER_STORAGE, null);
        
        if (lists && lists[selectedListName]) {
            studentList = lists[selectedListName];
            console.log(`Loaded student list: ${selectedListName}`);
        } else {
            console.log('No student list found');
            studentList = [];
        }
    }

    /**
     * Get all available student lists from random picker
     */
    function getAvailableLists() {
        const lists = ClassroomUtils.getFromStorage(CONSTANTS.RANDOM_PICKER_STORAGE, {});
        return Object.keys(lists).filter(key => key.toLowerCase().includes('student'));
    }

    /**
     * Switch to a different student list
     */
    function switchStudentList(listName) {
        selectedListName = listName;
        ClassroomUtils.saveToStorage(CONSTANTS.SELECTED_LIST_KEY, listName);
        loadStudentList();
        
        // Update the dropdown
        const dropdown = containerElement.querySelector('#studentListDropdown');
        if (dropdown) {
            dropdown.value = listName;
        }
    }

    /**
     * Load saved picker states from localStorage
     */
    function loadPickerStates() {
        pickerStates = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, null);
        
        if (pickerStates) {
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
    }

    /**
     * Save picker states to localStorage
     */
    function savePickerStates() {
        ClassroomUtils.saveToStorage(CONSTANTS.STORAGE_KEY, pickerStates);
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
     * Open info modal (now just explains how to use Random Picker)
     */
    function openStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        ClassroomUtils.toggleModal(modal, true);
    }

    /**
     * Close info modal
     */
    function closeStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        ClassroomUtils.toggleModal(modal, false);
    }

    /**
     * Render the pickers
     */
    function renderPickers() {
        if (!containerElement) return;

        const pickersHTML = pickerStates.map((picker, index) => `
        <div class="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 ${picker.locked ? 'border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-700'} rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary dark:bg-blue-500 text-white rounded-full font-bold text-sm">${index + 1}</div>
            <input
                type="text"
                class="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:focus:border-blue-400 text-sm"
                value="${picker.name}"
                placeholder="Empty"
                onchange="SevenPickersWidget.updateName(${index}, this.value)"
            >
            <button
                class="flex-shrink-0 w-9 h-9 flex items-center justify-center text-xl hover:scale-110 transition-transform"
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
     * Create widget HTML with Tailwind classes and student list dropdown
     */
    function createWidgetHTML() {
        return `
        <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 shadow-md flex flex-col h-full">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-primary dark:text-blue-400 text-2xl font-semibold">The 7 Pickers</h2>
                <select id="studentListDropdown" 
                        onchange="SevenPickersWidget.switchList(this.value)"
                        class="px-3 py-1.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:focus:border-blue-400">
                    <option value="">Select a list...</option>
                </select>
            </div>
            <div class="pickers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-grow"></div>
            <div class="flex gap-2.5 justify-center flex-wrap mt-4">
                <button onclick="SevenPickersWidget.randomize()"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    🎲 Pick 7 Random
                </button>
                <button onclick="SevenPickersWidget.clearAll()"
                        class="bg-red-500 text-white border-2 border-red-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-red-600 transition-all">
                    Clear All
                </button>
            </div>

            <div id="studentListModal" class="hidden fixed top-0 left-0 w-full h-full z-[1000] items-center justify-center">
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onclick="SevenPickersWidget.closeEditor()"></div>
                <div class="relative bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-8 max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl z-50">
                    <h2 class="text-gray-900 dark:text-gray-100 mb-5 text-2xl font-semibold">Student List Info</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-2.5">This widget loads student lists from the Random Picker widget.</p>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">To add or edit student lists:</p>
                    <ol class="list-decimal ml-6 text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                        <li>Open any page with the Random Picker widget</li>
                        <li>Click "Edit List" button</li>
                        <li>Create or select a list with "Students" in the name</li>
                        <li>Add your student names (one per line)</li>
                        <li>Click "Save Current List"</li>
                    </ol>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">Then return here and select it from the dropdown above!</p>
                    <div class="flex gap-2.5 mt-4 flex-wrap">
                        <button onclick="SevenPickersWidget.closeEditor()"
                                class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Populate the student list dropdown
     */
    function populateDropdown() {
        const dropdown = containerElement.querySelector('#studentListDropdown');
        if (!dropdown) return;

        const availableLists = getAvailableLists();
        
        // Clear existing options except the first placeholder
        dropdown.innerHTML = '<option value="">Select a list...</option>';
        
        // Add all available student lists
        availableLists.forEach(listName => {
            const option = document.createElement('option');
            option.value = listName;
            option.textContent = listName;
            if (listName === selectedListName) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
        
        // If no lists found, show helpful message
        if (availableLists.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No student lists found - use Random Picker to create one";
            option.disabled = true;
            dropdown.appendChild(option);
        }
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
        populateDropdown();
        renderPickers();

        // Show info if no students
        if (studentList.length === 0) {
            setTimeout(() => {
                openStudentEditor();
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
        switchList: switchStudentList,
        openEditor: openStudentEditor,
        closeEditor: closeStudentEditor
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', SevenPickersWidget.init);