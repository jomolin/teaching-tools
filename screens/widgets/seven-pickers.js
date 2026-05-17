// Seven Pickers Widget Module - For Heads Up 7-Up
//
// Phase 2 updates:
//   - Title ("The 7 Pickers") hidden by default. Opt-in via data-show-title="true".
//   - Idempotent init() (skips containers already marked data-initialized).
//   - Exposes SevenPickersWidget on window for the canvas controller.
//
// Note: this widget still uses module-scoped state (single instance per page),
// matching its previous design. Multiple seven-pickers on one page would share
// state.
const SevenPickersWidget = (function() {
    'use strict';

    const CONSTANTS = {
        STORAGE_KEY: 'sevenPickersState',
        SELECTED_LIST_KEY: 'sevenPickersSelectedList',
        RANDOM_PICKER_STORAGE: 'randomPickerLists',
        DEFAULT_LIST: 'Students 2026',
        NUM_PICKERS: 7
    };

    // Widget state (module-scoped - single instance per page)
    let pickerStates = [];
    let studentList = [];
    let selectedListName = '';
    let containerElement = null;
    let showTitle = false; // resolved from data-show-title in init()

    // ----- Student list loading ----------------------------------------------

    function loadStudentList() {
        selectedListName = ClassroomUtils.getFromStorage(CONSTANTS.SELECTED_LIST_KEY, CONSTANTS.DEFAULT_LIST);
        const lists = ClassroomUtils.getFromStorage(CONSTANTS.RANDOM_PICKER_STORAGE, null);
        if (lists && lists[selectedListName]) {
            studentList = lists[selectedListName];
            console.log(`Loaded student list: ${selectedListName}`);
        } else {
            console.log('No student list found');
            studentList = [];
        }
    }

    function getAvailableLists() {
        const lists = ClassroomUtils.getFromStorage(CONSTANTS.RANDOM_PICKER_STORAGE, {});
        return Object.keys(lists).filter(key => key.toLowerCase().includes('student'));
    }

    function switchStudentList(listName) {
        selectedListName = listName;
        ClassroomUtils.saveToStorage(CONSTANTS.SELECTED_LIST_KEY, listName);
        loadStudentList();
        const dropdown = containerElement.querySelector('#studentListDropdown');
        if (dropdown) dropdown.value = listName;
    }

    // ----- Picker state ------------------------------------------------------

    function loadPickerStates() {
        pickerStates = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, null);
        if (pickerStates) {
            while (pickerStates.length < CONSTANTS.NUM_PICKERS) {
                pickerStates.push({ name: '', locked: false });
            }
        } else {
            pickerStates = Array(CONSTANTS.NUM_PICKERS).fill(null).map(() => ({
                name: '',
                locked: false
            }));
        }
    }

    function savePickerStates() {
        ClassroomUtils.saveToStorage(CONSTANTS.STORAGE_KEY, pickerStates);
    }

    function getAvailableStudents() {
        const lockedNames = pickerStates
            .filter(p => p.locked && p.name)
            .map(p => p.name);
        return studentList.filter(name => !lockedNames.includes(name));
    }

    function randomizeUnlocked() {
        if (studentList.length === 0) {
            alert('No students in list! Use the List Manager to add a student list.');
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

        const shuffled = [...available].sort(() => Math.random() - 0.5);
        unlockedIndices.forEach((index, i) => {
            pickerStates[index].name = shuffled[i];
        });

        savePickerStates();
        renderPickers();
    }

    function toggleLock(index) {
        pickerStates[index].locked = !pickerStates[index].locked;
        savePickerStates();
        renderPickers();
    }

    function updatePickerName(index, name) {
        pickerStates[index].name = name;
        savePickerStates();
    }

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

    // ----- Modal -------------------------------------------------------------

    function openStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        ClassroomUtils.toggleModal(modal, true);
    }

    function closeStudentEditor() {
        const modal = containerElement.querySelector('#studentListModal');
        ClassroomUtils.toggleModal(modal, false);
    }

    // ----- Rendering ---------------------------------------------------------

    function renderPickers() {
        if (!containerElement) return;

        const pickersHTML = pickerStates.map((picker, index) => `
        <div class="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 ${picker.locked ? 'border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-700'} rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white rounded-full font-bold text-sm">${index + 1}</div>
            <input
                type="text"
                class="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value="${picker.name}"
                placeholder="Empty"
                onchange="SevenPickersWidget.updateName(${index}, this.value)"
            >
            <button
                class="flex-shrink-0 w-9 h-9 flex items-center justify-center text-lg hover:scale-110 transition-transform ${picker.locked ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}"
                onclick="SevenPickersWidget.toggleLock(${index})"
                title="${picker.locked ? 'Unlock' : 'Lock'}"
            >
                ${picker.locked ? '\u{1F512}' : '\u{1F513}'}
            </button>
        </div>
        `).join('');

        const grid = containerElement.querySelector('.pickers-grid');
        if (grid) grid.innerHTML = pickersHTML;
    }

    // Phase 2: title hidden by default. Opt in with data-show-title="true".
    // Pre-build the title block as a separate variable to keep the template
    // literal readable.
    function createWidgetHTML() {
        const titleHTML = showTitle
            ? `<h2 class="text-blue-600 dark:text-blue-400 text-2xl font-semibold">The 7 Pickers</h2>`
            : '';

        return `
        <div class="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col h-full">
            <div class="flex items-center justify-between mb-4">
                ${titleHTML}
                <select id="studentListDropdown"
                        onchange="SevenPickersWidget.switchList(this.value)"
                        class="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a list...</option>
                </select>
            </div>
            <div class="pickers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-grow"></div>
            <div class="flex gap-2.5 justify-center flex-wrap mt-4">
                <button onclick="SevenPickersWidget.randomize()"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    \u2684 Pick 7 Random
                </button>
                <button onclick="SevenPickersWidget.clearAll()"
                        class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    Clear All
                </button>
            </div>

            <div id="studentListModal" class="hidden fixed top-0 left-0 w-full h-full z-[1000] items-center justify-center">
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onclick="SevenPickersWidget.closeEditor()"></div>
                <div class="relative bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-8 max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl z-50">
                    <h2 class="text-gray-900 dark:text-gray-100 mb-5 text-2xl font-semibold">Student List Info</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-2.5">This widget loads student lists from the List Manager.</p>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">To add or edit student lists:</p>
                    <ol class="list-decimal ml-6 text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                        <li>Open the <strong>List Manager</strong> tool from the sidebar</li>
                        <li>Create a new list with "Students" in the name</li>
                        <li>Add your student names (one per line)</li>
                        <li>Save the list</li>
                    </ol>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">Then return here and select it from the dropdown above!</p>
                    <div class="flex gap-2.5 mt-4 flex-wrap">
                        <button onclick="SevenPickersWidget.closeEditor()"
                                class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function populateDropdown() {
        const dropdown = containerElement.querySelector('#studentListDropdown');
        if (!dropdown) return;

        const availableLists = getAvailableLists();

        dropdown.innerHTML = '<option value="">Select a list...</option>';

        availableLists.forEach(listName => {
            const option = document.createElement('option');
            option.value = listName;
            option.textContent = listName;
            if (listName === selectedListName) option.selected = true;
            dropdown.appendChild(option);
        });

        if (availableLists.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No student lists found - add one in List Manager';
            option.disabled = true;
            dropdown.appendChild(option);
        }
    }

    // ----- Init --------------------------------------------------------------

    function init() {
        containerElement = document.querySelector('.seven-pickers-widget');
        if (!containerElement) return;
        if (containerElement.dataset.initialized === 'true') return;

        // Resolve title preference (off by default; opt in with "true")
        showTitle = containerElement.getAttribute('data-show-title') === 'true';

        loadStudentList();
        loadPickerStates();

        containerElement.innerHTML = createWidgetHTML();
        populateDropdown();
        renderPickers();

        // If there's no student list set up yet, show the info modal
        if (studentList.length === 0) {
            setTimeout(() => openStudentEditor(), 500);
        }

        containerElement.dataset.initialized = 'true';
    }

    // ----- Public API --------------------------------------------------------

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

window.SevenPickersWidget = SevenPickersWidget;

document.addEventListener('DOMContentLoaded', SevenPickersWidget.init);