// Random Picker Widget Module - Supports Multiple Instances
// Persists selected list and pick state per instance via localStorage.
//
// Phase 2 updates:
//   - Title hidden by default. Opt-in via data-show-title="true".
//   - Idempotent init(): skips containers already marked data-initialized.
//   - Exposes RandomPickerWidget on window for the canvas controller.
const RandomPickerWidget = (function() {
    'use strict';

    // Use shared config if available, otherwise defaults
    const CONSTANTS = typeof ClassroomConfig !== 'undefined' ? ClassroomConfig.RANDOM_PICKER : {
        STORAGE_KEY: 'randomPickerLists',
        MIN_FONT_SIZE: 16,
        MAX_FONT_SIZE: 120,
        FONT_STEP: 2,
        LINE_HEIGHT: 1.2,
        PADDING_OFFSET: 20
    };

    // Derive a page slug from the URL path so each game page gets its own state.
    // e.g. "/screens/classroom-games/pass-the-creeper.html" -> "pass-the-creeper"
    const PAGE_SLUG = (function() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'unknown';
        return filename.replace('.html', '');
    })();

    // Shared saved lists (all instances see the same lists)
    let savedLists = {};

    // Array of widget instances
    const instances = [];

    // ----- Shared list storage -------------------------------------------------

    function loadSavedLists() {
        savedLists = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, {});
    }

    async function autoLoadListsFromJSON() {
        const existing = ClassroomUtils.getFromStorage(CONSTANTS.STORAGE_KEY, {});
        if (Object.keys(existing).length > 0) {
            savedLists = existing;
            return true;
        }
        const possiblePaths = [
            '../data/random-picker-lists.json',
            './random-picker-lists.json',
            '../random-picker-lists.json'
        ];
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    savedLists = await response.json();
                    saveLists();
                    console.log(`Bootstrap: loaded lists from ${path}`);
                    return true;
                }
            } catch (e) { /* try next */ }
        }
        return false;
    }

    function saveLists() {
        if (!ClassroomUtils.saveToStorage(CONSTANTS.STORAGE_KEY, savedLists)) {
            alert('Error saving lists. Storage may be full.');
        }
    }

    // ----- Per-instance pick state --------------------------------------------

    function getStateKey(instanceId) {
        return `randomPickerState_${PAGE_SLUG}_${instanceId}`;
    }

    function saveInstanceState(instance) {
        const state = {
            selectedList: instance.selectedListName || '',
            allItems: instance.allItems,
            availableItems: instance.availableItems,
            lastPicked: instance.lastPicked || ''
        };
        ClassroomUtils.saveToStorage(getStateKey(instance.id), state);
    }

    function loadInstanceState(instanceId) {
        return ClassroomUtils.getFromStorage(getStateKey(instanceId), null);
    }

    // ----- Font fit utility ---------------------------------------------------
    // Shrinks the result-text font size until nothing overflows the wrapper.
    // Module-scoped (not inside createInstance) so onResize can call it from
    // outside the instance closure.
    function fitTextToContainer(element) {
        if (!element) return;
        const wrapper = element.parentElement;
        if (!wrapper) return;

        const availW = wrapper.clientWidth;
        const availH = wrapper.clientHeight;
        if (availW === 0 || availH === 0) return;

        let fontSize = CONSTANTS.MAX_FONT_SIZE;
        element.style.fontSize = fontSize + 'px';
        element.style.lineHeight = CONSTANTS.LINE_HEIGHT.toString();

        while (fontSize > CONSTANTS.MIN_FONT_SIZE &&
               (element.scrollWidth > availW || element.scrollHeight > availH)) {
            fontSize -= CONSTANTS.FONT_STEP;
            element.style.fontSize = fontSize + 'px';
        }
    }

    // ----- Instance factory ---------------------------------------------------

    function createInstance(container, instanceId) {
        const instance = {
            id: instanceId,
            container: container,
            availableItems: [],
            allItems: [],
            selectedListName: '',
            lastPicked: '',
            elements: {}
        };

        instance.pick = function() {
            if (!instance.elements.itemsList || !instance.elements.randomResult || !instance.elements.remainingCount) return;

            const text = instance.elements.itemsList.value;
            const items = text.split('\n').filter(item => item.trim() !== '');

            if (items.length === 0) {
                instance.elements.randomResult.textContent = 'Add some items first!';
                instance.elements.remainingCount.textContent = '';
                return;
            }

            // Reset if the list has changed or all items have been picked
            if (instance.availableItems.length === 0 || JSON.stringify(instance.allItems) !== JSON.stringify(items)) {
                instance.allItems = items;
                instance.availableItems = [...items];
            }

            const randomIndex = Math.floor(Math.random() * instance.availableItems.length);
            const picked = instance.availableItems[randomIndex];
            instance.availableItems.splice(randomIndex, 1);

            instance.lastPicked = picked;
            instance.elements.randomResult.textContent = picked;
            fitTextToContainer(instance.elements.randomResult);

            if (instance.availableItems.length === 0) {
                instance.elements.remainingCount.textContent = 'All items picked! Click "Pick Random" to start over.';
                instance.availableItems = [...instance.allItems];
            } else {
                instance.elements.remainingCount.textContent = `${instance.availableItems.length} remaining`;
            }

            saveInstanceState(instance);
        };

        instance.reset = function() {
            instance.availableItems = [];
            instance.allItems = [];
            instance.lastPicked = '';
            if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
            if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
            saveInstanceState(instance);
        };

        instance.openModal = function() {
            ClassroomUtils.toggleModal(instance.elements.editModal, true);
        };

        instance.closeModal = function() {
            ClassroomUtils.toggleModal(instance.elements.editModal, false);
        };

        instance.saveList = function() {
            if (!instance.elements.itemsList) return;
            const listName = prompt('Enter a name for this list:');
            if (!listName || listName.trim() === '') return;
            const items = instance.elements.itemsList.value.split('\n').filter(item => item.trim() !== '');
            if (items.length === 0) {
                alert('Cannot save an empty list!');
                return;
            }
            savedLists[listName.trim()] = items;
            saveLists();
            alert(`List "${listName}" saved!`);
            instances.forEach(inst => inst.updateListDropdown());
        };

        instance.loadList = function() {
            if (!instance.elements.listSelector || !instance.elements.itemsList) return;
            const listName = instance.elements.listSelector.value;
            if (!listName) return;
            const items = savedLists[listName];
            if (items && Array.isArray(items)) {
                instance.elements.itemsList.value = items.join('\n');
                instance.selectedListName = listName;
                instance.availableItems = [];
                instance.allItems = [];
                instance.lastPicked = '';
                if (instance.elements.randomResult) instance.elements.randomResult.textContent = '';
                if (instance.elements.remainingCount) instance.elements.remainingCount.textContent = '';
                saveInstanceState(instance);
            }
        };

        instance.deleteList = function() {
            if (!instance.elements.listSelector) return;
            const listName = instance.elements.listSelector.value;
            if (!listName) return;
            if (confirm(`Delete list "${listName}"?`)) {
                delete savedLists[listName];
                saveLists();
                instances.forEach(inst => inst.updateListDropdown());
                if (instance.elements.itemsList) instance.elements.itemsList.value = '';
                if (instance.selectedListName === listName) {
                    instance.selectedListName = '';
                    instance.availableItems = [];
                    instance.allItems = [];
                    instance.lastPicked = '';
                    saveInstanceState(instance);
                }
            }
        };

        instance.updateListDropdown = function() {
            if (!instance.elements.listSelector) return;
            instance.elements.listSelector.innerHTML = '<option value="">-- Select a saved list --</option>';
            Object.keys(savedLists).sort().forEach(listName => {
                const option = document.createElement('option');
                option.value = listName;
                option.textContent = listName;
                if (listName === instance.selectedListName) option.selected = true;
                instance.elements.listSelector.appendChild(option);
            });
        };

        instance.exportLists = function() {
            const dataStr = JSON.stringify(savedLists, null, 2);
            ClassroomUtils.downloadFile(dataStr, 'random-picker-lists.json', 'application/json');
        };

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
                        alert("Error importing file. Make sure it's a valid JSON file.");
                        return;
                    }
                    const shouldReplace = confirm('Replace existing lists? (Cancel to merge with current lists)');
                    if (shouldReplace) {
                        savedLists = importedLists;
                    } else {
                        savedLists = { ...savedLists, ...importedLists };
                    }
                    saveLists();
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

        // Restore persisted state on init: reload selected list and pick position
        instance.restoreState = function() {
            const saved = loadInstanceState(instance.id);
            if (!saved) return;

            instance.selectedListName = saved.selectedList || '';

            if (instance.selectedListName && savedLists[instance.selectedListName]) {
                const items = savedLists[instance.selectedListName];
                if (instance.elements.itemsList) {
                    instance.elements.itemsList.value = items.join('\n');
                }
                instance.allItems = saved.allItems || [];
                instance.availableItems = saved.availableItems || [];
                instance.lastPicked = saved.lastPicked || '';

                // If list changed since last session, reset pick state
                if (JSON.stringify(instance.allItems) !== JSON.stringify(items)) {
                    instance.allItems = [];
                    instance.availableItems = [];
                    instance.lastPicked = '';
                }

                if (instance.lastPicked && instance.elements.randomResult) {
                    instance.elements.randomResult.textContent = instance.lastPicked;
                    fitTextToContainer(instance.elements.randomResult);
                }

                if (instance.elements.remainingCount) {
                    if (instance.allItems.length > 0 && instance.availableItems.length > 0) {
                        instance.elements.remainingCount.textContent = `${instance.availableItems.length} remaining`;
                    } else if (instance.allItems.length > 0 && instance.availableItems.length === 0) {
                        instance.elements.remainingCount.textContent = 'All items picked! Click "Pick Random" to start over.';
                    }
                }
            }

            if (instance.elements.listSelector && instance.selectedListName) {
                instance.elements.listSelector.value = instance.selectedListName;
            }
        };

        return instance;
    }

    // ----- HTML templates -----------------------------------------------------

    // Phase 2: showTitle defaults to false. Opt in via data-show-title="true".
    function createRandomPickerWidget(instanceId, title, showTitle) {
        title = title || 'Random Picker';
        showTitle = showTitle === true;
        const titleHTML = showTitle
            ? `<h2 class="text-blue-600 dark:text-blue-400 mb-4 text-2xl font-semibold">${title}</h2>`
            : '';
        return `
        <div class="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col h-full">
            ${titleHTML}
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

    function getInstance(instanceId) {
        return instances.find(inst => inst.id === instanceId);
    }

    // ----- Initialization ------------------------------------------------------

    async function init() {
        loadSavedLists();
        await autoLoadListsFromJSON();

        const containers = document.querySelectorAll('.random-picker-widget');

        containers.forEach((container, index) => {
            if (container.dataset.initialized === 'true') return;

            const instanceId = container.id || `picker-${index}`;
            const customTitle = container.getAttribute('data-title') || 'Random Picker';
            // Title off by default; opt in with data-show-title="true"
            const showTitle = container.getAttribute('data-show-title') === 'true';

            const instance = createInstance(container, instanceId);
            instances.push(instance);

            // Render the widget HTML
            container.innerHTML = createRandomPickerWidget(instanceId, customTitle, showTitle);

            // Each instance gets its own modal appended into its container
            const modal = document.createElement('div');
            modal.id = `editModal-${instanceId}`;
            modal.className = 'hidden fixed top-0 left-0 w-full h-full z-[1000] items-center justify-center';
            modal.innerHTML = createModalHTML(instanceId);
            container.appendChild(modal);

            // Cache DOM element references
            instance.elements.editModal = document.getElementById(`editModal-${instanceId}`);
            instance.elements.itemsList = document.getElementById(`itemsList-${instanceId}`);
            instance.elements.randomResult = document.getElementById(`randomResult-${instanceId}`);
            instance.elements.remainingCount = document.getElementById(`remainingCount-${instanceId}`);
            instance.elements.listSelector = document.getElementById(`listSelector-${instanceId}`);

            instance.updateListDropdown();
            instance.restoreState();

            container.dataset.initialized = 'true';
        });
    }

    // ----- Public API ----------------------------------------------------------

    // Find which instance owns a given DOM container element (used by onResize)
    function findInstanceByContainer(container) {
        return instances.find(inst => inst.container === container);
    }

    return {
        init: init,
        // Called by the canvas's ResizeObserver when a tile is resized. Re-runs
        // font-fit logic so the picked-name text scales with the tile.
        onResize: function(container) {
            const instance = findInstanceByContainer(container);
            if (!instance) return;
            // requestAnimationFrame lets the browser commit the new dimensions
            // before we measure - avoids reading stale clientWidth/clientHeight
            requestAnimationFrame(() => {
                fitTextToContainer(instance.elements.randomResult);
            });
        },
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

window.RandomPickerWidget = RandomPickerWidget;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', RandomPickerWidget.init);