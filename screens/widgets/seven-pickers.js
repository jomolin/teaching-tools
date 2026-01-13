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
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    /**
     * Close student list editor
     */
    function closeStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
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
     * Create widget HTML with Tailwind classes
     */
    function createWidgetHTML() {
        return `
        <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 shadow-md flex flex-col h-full">
            <h2 class="text-primary dark:text-blue-400 mb-4 text-2xl font-semibold">The 7 Pickers</h2>
            <div class="pickers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-grow"></div>
            <div class="flex gap-2.5 justify-center flex-wrap mt-4">
                <button onclick="SevenPickersWidget.randomize()"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    🎲 Pick 7 Random
                </button>
                <button onclick="SevenPickersWidget.openEditor()"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    📝 Edit Student List
                </button>
                <button onclick="SevenPickersWidget.clearAll()"
                        class="bg-red-500 text-white border-2 border-red-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-red-600 transition-all">
                    Clear All
                </button>
            </div>

            <div id="studentListModal" class="hidden fixed top-0 left-0 w-full h-full z-[1000] items-center justify-center">
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onclick="SevenPickersWidget.closeEditor()"></div>
                <div class="relative bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-8 max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl z-50">
                    <h2 class="text-gray-900 dark:text-gray-100 mb-5 text-2xl font-semibold">Edit Student List</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-2.5">Enter one student name per line:</p>
                    <textarea id="studentListTextarea" 
                              placeholder="Student 1&#10;Student 2&#10;Student 3&#10;..." 
                              class="w-full h-72 p-2.5 text-base bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-2 border-primary dark:border-blue-400 rounded-lg focus:outline-none"></textarea>
                    <div class="flex gap-2.5 mt-4 flex-wrap">
                        <button onclick="SevenPickersWidget.saveStudentList()"
                                class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                            💾 Save Student List
                        </button>
                        <button onclick="SevenPickersWidget.closeEditor()"
                                class="bg-gray-500 dark:bg-gray-700 text-white border-2 border-gray-600 dark:border-gray-600 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                            Cancel
                        </button>
                    </div>
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