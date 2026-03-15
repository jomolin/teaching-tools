// Random Picker Widget Module - Supports Multiple Instances
// Persists selected list and pick state per instance via localStorage
const RandomPickerWidget = (function() {
    'use strict';

    // Use shared config if available, otherwise use defaults
    const CONSTANTS = typeof ClassroomConfig !== 'undefined' ? ClassroomConfig.RANDOM_PICKER : {
        STORAGE_KEY: 'randomPickerLists',
        MIN_FONT_SIZE: 16,
        MAX_FONT_SIZE: 120,
        FONT_STEP: 2,
        LINE_HEIGHT: 1.2,
        PADDING_OFFSET: 20
    };

    // Derive a page slug from the URL path so each game page gets its own state
    // e.g. "/screens/classroom-games/pass-the-creeper.html" → "pass-the-creeper"
    const PAGE_SLUG = (function() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'unknown';
        return filename.replace('.html', '');
    })();

    // Shared saved lists (all instances can access these)
    let savedLists = {};

    // Array to store all widget instances
    const instances = [];

    /**
     * Load saved lists from localStorage
     */
    function loadSavedLists() {
        savedLists = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, {});
    }

    /**
     * Auto-load lists from JSON file if no lists exist in localStorage yet.
     * Once lists are in localStorage (managed via List Manager), JSON is skipped.
     */
    async function autoLoadListsFromJSON() {
        // Only auto-load if localStorage has no lists yet (first-time bootstrap)
        const existingLists = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, {});
        if (Object.keys(existingLists).length > 0) {
            savedLists = existingLists;
            return true;
        }

        // Try multiple possible paths for the JSON file
        const possiblePaths = [
            '../data/random-picker-lists.json',  // screens folder structure
            './random-picker-lists.json',        // same directory
            '../random-picker-lists.json'        // widgets folder structure
        ];

        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const importedLists = await response.json();
                    savedLists = importedLists;
                    saveLists();
                    console.log(`Bootstrap: loaded lists from ${path}`);
                    return true;
                }
            } catch (error) {
                continue;
            }
        }

        console.log('No JSON file found in any expected location');
        return false;
    }

    /**
     * Save lists to localStorage
     */
    function saveLists() {
        if (!ClassroomUtils.saveToStorage(CONSTANTS.STORAGE_KEY, savedLists)) {
            alert('Error saving lists. Storage may be full.');
        }
    }

    /**
     * Get the localStorage key for an instance's persisted state.
     * Scoped to the page so the same instanceId (e.g. "studentPicker") on different
     * game pages gets independent pick tracking.
     */
    function getStateKey(instanceId) {
        return `randomPickerState_${PAGE_SLUG}_${instanceId}`;
    }

    /**
     * Save instance pick state to localStorage
     */
    function saveInstanceState(instance) {
        const state = {
            selectedList: instance.selectedListName || '',
            allItems: instance.allItems,
            availableItems: instance.availableItems,
            lastPicked: instance.lastPicked || ''
        };
        ClassroomUtils.saveToStorage(getStateKey(instance.id), state);
    }

    /**
     * Load instance pick state from localStorage
     */
    function loadInstanceState(instanceId) {
        return ClassroomUtils.getFromStorage(getStateKey(instanceId), null);
    }

    /**
     * Create a single picker instance
     */
    function createInstance(container, instanceId) {
        // Instance-specific state
        const instance = {
            id: instanceId,
            container: container,
            availableItems: [],
            allItems: [],
            selectedListName: '',
            lastPicked: '',
            elements: {}
        };

        /**
         * Fit the text inside the result element by shrinking font size until
         * nothing overflows. Measures in-place on the real DOM element so
         * line-wrapping, padding, and font metrics are all accurate.
         */
        function fitTextToContainer(element) {
            const wrapper = element.parentElement;
            if (!wrapper) return;

            const availW = wrapper.clientWidth;
            const availH = wrapper.clientHeight;
            if (availW === 0 || availH === 0) return;

            let fontSize = CONSTANTS.MAX_FONT_SIZE;
            element.style.fontSize = fontSize + 'px';
            element.style.lineHeight = CONSTANTS.LINE_HEIGHT.toString();

            // Shrink until the text fits entirely within the wrapper
            while (fontSize > CONSTANTS.MIN_FONT_SIZE &&
                   (element.scrollWidth > availW || element.scrollHeight > availH)) {
                fontSize -= CONSTANTS.FONT_STEP;
                element.style.fontSize = fontSize + 'px';
            }
        }

        /**
         * Pick a random item from the list
         */
        instance.pick = function() {
            if (!instance.elements.itemsList || !instance.elements.randomResult || !instance.elements.remainingCount) return;

            const text = instance.elements.itemsList.value;
            const items = text.split('\n').filter(item => item.trim() !== '');

            if (items.length === 0) {
                instance.elements.randomResult.textContent = 'Add some items first!';
                instance.elements.remainingCount.textContent = '';
                return;
            }

            // If the list changed or we're out of items, reset
            if (instance.availableItems.length === 0 || JSON.stringify(instance.allItems) !== JSON.stringify(items)) {
                instance.allItems = items;
                instance.availableItems = [...items];
            }

            // Pick random from available items
            const randomIndex = Math.floor(Math.random() * instance.availableItems.length);
            const picked = instance.availableItems[randomIndex];

            // Remove from available items
            instance.availableItems.splice(randomIndex, 1);

            // Display result with optimal font size
            instance.lastPicked = picked;
            instance.elements.randomResult.textContent = picked;
            fitTextToContainer(instance.elements.randomResult);

            // Show remaining count
            if (instance.availableItems.length === 0) {
                instance.elements.remainingCount.textContent = 'All items picked! Click "Pick Random" to start over.';
                instance.availableItems = [...instance.allItems];
            } else {
                instance.elements.remainingCount.textContent = `${instance.availableItems.length} remaining`;
            }

            // Persist pick state
            saveInstanceState(instance);
        };

        /**
         * Reset the picker (clears pick state, keeps list loaded)
         */
        instance.reset = function() {
            instance.availableItems = [];
            instance.allItems = [];
            instance.lastPicked = '';
            if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
            if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
            saveInstanceState(instance);
        };

        /**
         * Open the edit modal
         */
        instance.openModal = function() {
            ClassroomUtils.toggleModal(instance.elements.editModal, true);
        };

        /**
         * Close the edit modal
         */
        instance.closeModal = function() {
            ClassroomUtils.toggleModal(instance.elements.editModal, false);
        };

        /**
         * Save current list with a name
         */
        instance.saveList = function() {
            if (!instance.elements.itemsList) return;

            const listName = prompt('Enter a name for this list:');
            if (!listName || listName.trim() === '') return;

            const text = instance.elements.itemsList.value;
            const items = text.split('\n').filter(item => item.trim() !== '');

            if (items.length === 0) {
                alert('Cannot save an empty list!');
                return;
            }

            savedLists[listName.trim()] = items;
            saveLists();
            alert(`List "${listName}" saved!`);
            // Update all instance dropdowns
            instances.forEach(inst => inst.updateListDropdown());
        };

        /**
         * Load a saved list from the dropdown
         */
        instance.loadList = function() {
            if (!instance.elements.listSelector || !instance.elements.itemsList) return;

            const listName = instance.elements.listSelector.value;
            if (!listName) return;

            const items = savedLists[listName];
            if (items && Array.isArray(items)) {
                instance.elements.itemsList.value = items.join('\n');
                instance.selectedListName = listName;
                // Reset pick state when loading a new list
                instance.availableItems = [];
                instance.allItems = [];
                instance.lastPicked = '';
                if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
                if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
                // Persist selected list name and reset state
                saveInstanceState(instance);
            }
        };

        /**
         * Delete a saved list
         */
        instance.deleteList = function() {
            if (!instance.elements.listSelector) return;

            const listName = instance.elements.listSelector.value;
            if (!listName) return;

            if (confirm(`Delete list "${listName}"?`)) {
                delete savedLists[listName];
                saveLists();
                // Update all instance dropdowns
                instances.forEach(inst => inst.updateListDropdown());
                if (instance.elements.itemsList) instance.elements.itemsList.value = '';
                // Clear persisted state if deleted list was the active one
                if (instance.selectedListName === listName) {
                    instance.selectedListName = '';
                    instance.availableItems = [];
                    instance.allItems = [];
                    instance.lastPicked = '';
                    saveInstanceState(instance);
                }
            }
        };

        /**
         * Update the list dropdown selector, restoring previous selection if available
         */
        instance.updateListDropdown = function() {
            if (!instance.elements.listSelector) return;

            instance.elements.listSelector.innerHTML = '<option value="">-- Select a saved list --</option>';

            Object.keys(savedLists).sort().forEach(listName => {
                const option = document.createElement('option');
                option.value = listName;
                option.textContent = listName;
                // Restore previously selected list
                if (listName === instance.selectedListName) {
                    option.selected = true;
                }
                instance.elements.listSelector.appendChild(option);
            });
        };

        /**
         * Export lists to JSON file
         */
        instance.exportLists = function() {
            const dataStr = JSON.stringify(savedLists, null, 2);
            ClassroomUtils.downloadFile(dataStr, 'random-picker-lists.json', 'application/json');
        };

        /**
         * Import lists from JSON file
         */
        instance.importLists = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';

            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = function(event) {
                    const importedLists = ClassroomUtils.safeParseJSON(event.target.result, null);

                    if (!importedLists || typeof importedLists !== 'object') {
                        alert('Error importing file. Make sure it\'s a valid JSON file.');
                        return;
                    }

                    const shouldReplace = confirm('Replace existing lists? (Cancel to merge with current lists)');

                    if (shouldReplace) {
                        savedLists = importedLists;
                    } else {
                        savedLists = { ...savedLists, ...importedLists };
                    }

                    saveLists();
                    // Update all instance dropdowns
                    instances.forEach(inst => inst.updateListDropdown());
                    alert('Lists imported successfully!');
                };

                reader.onerror = function() {
                    console.error('Error reading file');
                    alert('Error reading file. Please try again.');
                };

                reader.readAsText(file);
            };

            input.click();
        };

        /**
         * Restore persisted state on init: reload the selected list and pick position
         */
        instance.restoreState = function() {
            const saved = loadInstanceState(instance.id);
            if (!saved) return;

            instance.selectedListName = saved.selectedList || '';

            // If a list was previously selected, reload it into the textarea
            if (instance.selectedListName && savedLists[instance.selectedListName]) {
                const items = savedLists[instance.selectedListName];
                if (instance.elements.itemsList) {
                    instance.elements.itemsList.value = items.join('\n');
                }
                // Restore pick state
                instance.allItems = saved.allItems || [];
                instance.availableItems = saved.availableItems || [];
                instance.lastPicked = saved.lastPicked || '';

                // Verify allItems still matches the current list data
                // (list may have been edited in List Manager since last session)
                const currentItems = items;
                if (JSON.stringify(instance.allItems) !== JSON.stringify(currentItems)) {
                    // List changed since last session — reset pick state but keep list loaded
                    instance.allItems = [];
                    instance.availableItems = [];
                    instance.lastPicked = '';
                }

                // Restore last picked display
                if (instance.lastPicked && instance.elements.randomResult) {
                    instance.elements.randomResult.textContent = instance.lastPicked;
                    fitTextToContainer(instance.elements.randomResult);
                }

                // Restore remaining count
                if (instance.elements.remainingCount) {
                    if (instance.allItems.length > 0 && instance.availableItems.length > 0) {
                        instance.elements.remainingCount.textContent = `${instance.availableItems.length} remaining`;
                    } else if (instance.allItems.length > 0 && instance.availableItems.length === 0) {
                        instance.elements.remainingCount.textContent = 'All items picked! Click "Pick Random" to start over.';
                    }
                }
            }

            // Restore dropdown selection
            if (instance.elements.listSelector && instance.selectedListName) {
                instance.elements.listSelector.value = instance.selectedListName;
            }
        };

        return instance;
    }

    /**
     * Create random picker widget HTML
     * Uses design doc standard: bg-white dark:bg-gray-800, text-blue-600 dark:text-blue-400
     */
    function createRandomPickerWidget(instanceId, title = 'Random Picker') {
        return `
        <div class="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col h-full">
            <h2 class="text-blue-600 dark:text-blue-400 mb-4 text-2xl font-semibold">${title}</h2>
            <div class="relative flex-grow min-h-0 my-5">
                <div id="randomResult-${instanceId}" 
                     class="absolute inset-0 text-center text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center p-2.5 break-words"
                     style="font-size: 72px; line-height: 1.2;"></div>
            </div>
            <div id="remainingCount-${instanceId}" 
                 class="text-center text-gray-600 dark:text-gray-400 text-sm mt-2.5"></div>
            <div class="flex gap-2.5 justify-center flex-wrap mt-4">
                <button onclick="RandomPickerWidget.pick('${instanceId}')"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    Pick Random
                </button>
                <button onclick="RandomPickerWidget.openModal('${instanceId}')"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    Edit List
                </button>
                <button onclick="RandomPickerWidget.reset('${instanceId}')"
                        class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    Reset List
                </button>
            </div>
        </div>
        `;
    }

    /**
     * Create modal HTML with Tailwind classes matching design doc
     * Uses Unicode symbols instead of emoji for button labels
     */
    function createModalHTML(instanceId) {
        return `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onclick="RandomPickerWidget.closeModal('${instanceId}')"></div>
        <div class="relative bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-8 max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl z-50">
            <h2 class="text-gray-900 dark:text-gray-100 mb-5 text-2xl font-semibold">Edit List</h2>
            <div class="my-4">
                <select id="listSelector-${instanceId}" 
                        onchange="RandomPickerWidget.loadList('${instanceId}')" 
                        class="w-full p-2.5 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select a saved list --</option>
                </select>
            </div>
            <textarea id="itemsList-${instanceId}" 
                      placeholder="Enter items (one per line)&#10;Student 1&#10;Student 2&#10;Student 3" 
                      class="w-full h-52 p-2.5 text-base bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-700 rounded-lg my-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            <div class="flex gap-2.5 mt-2.5 flex-wrap">
                <button onclick="RandomPickerWidget.saveList('${instanceId}')"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    \u2913 Save Current List
                </button>
                <button onclick="RandomPickerWidget.deleteList('${instanceId}')"
                        class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    \u2715 Delete Selected
                </button>
                <button onclick="RandomPickerWidget.exportLists('${instanceId}')"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    \u2191 Export All Lists
                </button>
                <button onclick="RandomPickerWidget.importLists('${instanceId}')"
                        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    \u2193 Import Lists
                </button>
            </div>
            <div class="flex gap-2.5 mt-2.5 flex-wrap">
                <button onclick="RandomPickerWidget.closeModal('${instanceId}')"
                        class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold px-5 py-2.5 rounded-lg transition-colors">
                    Close
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
     * Initialize random picker widgets
     */
    async function init() {
        // Load saved lists from localStorage
        loadSavedLists();

        // Bootstrap from JSON only if localStorage is empty (first-time setup)
        await autoLoadListsFromJSON();

        // Create widget HTML for each container
        const containers = document.querySelectorAll('.random-picker-widget');

        containers.forEach((container, index) => {
            // Create unique ID for this instance
            const instanceId = container.id || `picker-${index}`;

            // Get custom title from data attribute
            const customTitle = container.getAttribute('data-title') || 'Random Picker';

            // Create instance
            const instance = createInstance(container, instanceId);
            instances.push(instance);

            // Add widget HTML
            container.innerHTML = createRandomPickerWidget(instanceId, customTitle);

            // Add modal to container (each instance has its own modal)
            const modal = document.createElement('div');
            modal.id = `editModal-${instanceId}`;
            modal.className = 'hidden fixed top-0 left-0 w-full h-full z-[1000] items-center justify-center';
            modal.innerHTML = createModalHTML(instanceId);
            container.appendChild(modal);

            // Cache DOM elements for this instance
            instance.elements.editModal = document.getElementById(`editModal-${instanceId}`);
            instance.elements.itemsList = document.getElementById(`itemsList-${instanceId}`);
            instance.elements.randomResult = document.getElementById(`randomResult-${instanceId}`);
            instance.elements.remainingCount = document.getElementById(`remainingCount-${instanceId}`);
            instance.elements.listSelector = document.getElementById(`listSelector-${instanceId}`);

            // Initialize dropdown
            instance.updateListDropdown();

            // Restore persisted state (selected list + pick position)
            instance.restoreState();
        });
    }

    // Public API
    return {
        init: init,
        pick: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.pick();
        },
        reset: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.reset();
        },
        openModal: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.openModal();
        },
        closeModal: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.closeModal();
        },
        saveList: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.saveList();
        },
        loadList: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.loadList();
        },
        deleteList: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.deleteList();
        },
        exportLists: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.exportLists();
        },
        importLists: function(instanceId) {
            const instance = getInstance(instanceId);
            if (instance) instance.importLists();
        }
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', RandomPickerWidget.init);