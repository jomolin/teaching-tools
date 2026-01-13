// Random Picker Widget Module - Supports Multiple Instances
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

    // Shared saved lists (all instances can access these)
    let savedLists = {};

    // Array to store all widget instances
    const instances = [];

    /**
     * Load saved lists from localStorage
     */
    function loadSavedLists() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
            savedLists = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading saved lists:', error);
            savedLists = {};
        }
    }

    /**
     * Auto-load lists from JSON file if available
     */
    async function autoLoadListsFromJSON() {
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

                    // Merge JSON lists with existing localStorage lists
                    // JSON lists come first, so localStorage takes priority on conflicts
                    const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
                    const existingLists = stored ? JSON.parse(stored) : {};

                    // Merge: existing lists override imported lists with same name
                    savedLists = { ...importedLists, ...existingLists };
                    saveLists();

                    console.log(`Auto-loaded and merged lists from ${path}`);
                    return true;
                }
            } catch (error) {
                // Try next path
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
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(savedLists));
        } catch (error) {
            console.error('Error saving lists:', error);
            alert('Error saving lists. Storage may be full.');
        }
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
            elements: {}
        };

        /**
         * Calculate optimal font size for display
         */
        function calculateFontSize(text, containerWidth, containerHeight) {
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'normal';
            tempSpan.style.wordBreak = 'break-word';
            tempSpan.style.width = (containerWidth - CONSTANTS.PADDING_OFFSET) + 'px';
            tempSpan.style.display = 'flex';
            tempSpan.style.alignItems = 'center';
            tempSpan.style.justifyContent = 'center';
            tempSpan.style.textAlign = 'center';
            tempSpan.textContent = text;
            document.body.appendChild(tempSpan);

            const availableHeight = containerHeight - CONSTANTS.PADDING_OFFSET;
            let fontSize = CONSTANTS.MAX_FONT_SIZE;

            while (fontSize > CONSTANTS.MIN_FONT_SIZE) {
                tempSpan.style.fontSize = fontSize + 'px';
                tempSpan.style.lineHeight = CONSTANTS.LINE_HEIGHT.toString();

                if (tempSpan.offsetHeight <= availableHeight) {
                    break;
                }
                fontSize -= CONSTANTS.FONT_STEP;
            }

            document.body.removeChild(tempSpan);
            return fontSize;
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
            instance.elements.randomResult.textContent = picked;

            const fontSize = calculateFontSize(
                picked,
                instance.elements.randomResult.clientWidth,
                instance.elements.randomResult.clientHeight
            );

            instance.elements.randomResult.style.fontSize = fontSize + 'px';
            instance.elements.randomResult.style.lineHeight = CONSTANTS.LINE_HEIGHT.toString();

            // Show remaining count
            if (instance.availableItems.length === 0) {
                instance.elements.remainingCount.textContent = 'All items picked! Click "Pick Random" to start over.';
                instance.availableItems = [...instance.allItems];
            } else {
                instance.elements.remainingCount.textContent = `${instance.availableItems.length} remaining`;
            }
        };

        /**
         * Reset the picker
         */
        instance.reset = function() {
            instance.availableItems = [];
            instance.allItems = [];
            if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
            if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
        };

            /**
             * Open the edit modal
             */
            instance.openModal = function() {
                if (instance.elements.editModal) {
                    instance.elements.editModal.classList.remove('hidden');
                    instance.elements.editModal.classList.add('flex');
                }
            };

            /**
             * Close the edit modal
             */
            instance.closeModal = function() {
                if (instance.elements.editModal) {
                    instance.elements.editModal.classList.add('hidden');
                    instance.elements.editModal.classList.remove('flex');
                }
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
                instance.updateListDropdown();
            };

            /**
             * Load a saved list
             */
            instance.loadList = function() {
                if (!instance.elements.listSelector || !instance.elements.itemsList) return;

                const listName = instance.elements.listSelector.value;
                if (!listName) return;

                const items = savedLists[listName];
                if (items && Array.isArray(items)) {
                    instance.elements.itemsList.value = items.join('\n');
                    instance.availableItems = [];
                    instance.allItems = [];
                    if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
                    if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
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
                    instance.updateListDropdown();
                    if (instance.elements.itemsList) instance.elements.itemsList.value = '';
                }
            };

            /**
             * Update the list dropdown selector
             */
            instance.updateListDropdown = function() {
                if (!instance.elements.listSelector) return;

                instance.elements.listSelector.innerHTML = '<option value="">-- Select a saved list --</option>';

                Object.keys(savedLists).sort().forEach(listName => {
                    const option = document.createElement('option');
                    option.value = listName;
                    option.textContent = listName;
                    instance.elements.listSelector.appendChild(option);
                });
            };

            /**
             * Export lists to JSON file
             */
            instance.exportLists = function() {
                try {
                    const dataStr = JSON.stringify(savedLists, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'random-picker-lists.json';
                    link.click();
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error('Error exporting lists:', error);
                    alert('Error exporting lists. Please try again.');
                }
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
                        try {
                            const importedLists = JSON.parse(event.target.result);

                            if (typeof importedLists !== 'object' || importedLists === null) {
                                throw new Error('Invalid file format');
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
                        } catch (error) {
                            console.error('Error importing lists:', error);
                            alert('Error importing file. Make sure it\'s a valid JSON file.');
                        }
                    };

                    reader.onerror = function() {
                        console.error('Error reading file');
                        alert('Error reading file. Please try again.');
                    };

                    reader.readAsText(file);
                };

                input.click();
            };

            return instance;
    }

    /**
     * Create random picker widget HTML
     */
    function createRandomPickerWidget(instanceId, title = 'Random Picker') {
        return `
        <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6 shadow-md flex flex-col h-full">
            <h2 class="text-primary dark:text-blue-400 mb-4 text-2xl font-semibold">${title}</h2>
            <div id="randomResult-${instanceId}" 
                 class="text-center text-primary dark:text-blue-400 font-bold my-5 flex items-center justify-center flex-grow overflow-hidden p-2.5 min-h-0 break-words"
                 style="font-size: 72px; line-height: 1.2;"></div>
            <div id="remainingCount-${instanceId}" 
                 class="text-center text-gray-600 dark:text-gray-400 text-sm mt-2.5"></div>
            <div class="flex gap-2.5 justify-center flex-wrap mt-4">
                <button onclick="RandomPickerWidget.pick('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    Pick Random
                </button>
                <button onclick="RandomPickerWidget.openModal('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    Edit List
                </button>
                <button onclick="RandomPickerWidget.reset('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    Reset List
                </button>
            </div>
        </div>
        `;
    }

    /**
     * Create modal HTML with Tailwind classes
     */
    function createModalHTML(instanceId) {
        return `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onclick="RandomPickerWidget.closeModal('${instanceId}')"></div>
        <div class="relative bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-8 max-w-[600px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl z-50">
            <h2 class="text-gray-900 dark:text-gray-100 mb-5 text-2xl font-semibold">Edit List</h2>
            <div class="my-4">
                <select id="listSelector-${instanceId}" 
                        onchange="RandomPickerWidget.loadList('${instanceId}')" 
                        class="w-full p-2.5 text-base bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-2 border-primary dark:border-blue-400 rounded-lg focus:outline-none">
                    <option value="">-- Select a saved list --</option>
                </select>
            </div>
            <textarea id="itemsList-${instanceId}" 
                      placeholder="Enter items (one per line)&#10;Student 1&#10;Student 2&#10;Student 3" 
                      class="w-full h-52 p-2.5 text-base bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-2 border-primary dark:border-blue-400 rounded-lg my-2.5 focus:outline-none"></textarea>
            <div class="flex gap-2.5 mt-2.5 flex-wrap">
                <button onclick="RandomPickerWidget.saveList('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    💾 Save Current List
                </button>
                <button onclick="RandomPickerWidget.deleteList('${instanceId}')"
                        class="bg-red-500 text-white border-2 border-red-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-red-600 transition-all">
                    🗑️ Delete Selected
                </button>
                <button onclick="RandomPickerWidget.exportLists('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    📤 Export All Lists
                </button>
                <button onclick="RandomPickerWidget.importLists('${instanceId}')"
                        class="bg-primary dark:bg-blue-500 text-white border-2 border-primary dark:border-blue-500 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
                    📥 Import Lists
                </button>
            </div>
            <div class="flex gap-2.5 mt-2.5 flex-wrap">
                <button onclick="RandomPickerWidget.closeModal('${instanceId}')"
                        class="bg-gray-500 dark:bg-gray-700 text-white border-2 border-gray-600 dark:border-gray-600 font-semibold px-5 py-2.5 rounded-lg hover:opacity-85 hover:-translate-y-0.5 transition-all">
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
        // Load saved lists
        loadSavedLists();

        // Auto-load from JSON file if available
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