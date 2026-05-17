// Title Widget Module - Refactored to IIFE pattern for Phase 2
// Editable message and instructions display with localStorage persistence.
//
// Phase 2 changes:
//   1. Wrapped in IIFE so it matches every other widget's shape
//   2. Exposed on window as `TitleWidget` so the canvas can call init() at runtime
//   3. init() is idempotent: skips containers already marked with data-initialized
//      so re-running init after adding a new tile doesn't wipe user-typed content
//      from existing tiles
//   4. Switched #message / #instructions IDs to .title-message / .title-instructions
//      classes - the IDs collided when multiple title widgets shared a page (as
//      can now happen on the canvas)
//
// Phase 1-and-earlier screens (classroom.html, ssr.html, silent-ball.html, etc.)
// continue to work unchanged because:
//   - The widget still renders a `bg-white ... rounded-xl` card with editable
//     message and instructions divs
//   - Auto-init on DOMContentLoaded still happens
//   - The class selector `.title-widget` and `data-title`/`data-instructions`
//     attributes are unchanged
//   - The widgets.css rules for #message and #instructions become inert, but
//     they were already overridden by Tailwind classes inline, so no visual change

const TitleWidget = (function() {
    'use strict';

    /**
     * Build the inner HTML for a single title widget instance.
     */
    function createTitleWidget(title, instructions) {
        title = title || '';
        instructions = instructions || '';
        return `
            <div class="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-8 shadow-sm h-full flex flex-col">
                <div contenteditable="true"
                     class="title-message text-5xl text-center text-gray-900 dark:text-gray-100 min-h-[60px] font-bold border-2 border-transparent p-2.5 rounded-lg cursor-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-50 dark:focus:bg-gray-900 empty:before:content-['Click_to_type_message...'] empty:before:text-gray-500 dark:empty:before:text-gray-400"
                >${title}</div>
                <div contenteditable="true"
                     class="title-instructions text-xl text-gray-600 dark:text-gray-400 min-h-[40px] border-2 border-transparent p-2.5 rounded-lg cursor-text mt-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-50 dark:focus:bg-gray-900 empty:before:content-['Click_to_add_instructions...'] empty:before:text-gray-500 dark:empty:before:text-gray-400 flex-grow [&_ol]:list-decimal [&_ol]:ml-6 [&_ul]:list-disc [&_ul]:ml-6 [&_li]:my-1"
                >${instructions}</div>
            </div>
        `;
    }

    /**
     * Initialize all title widgets in the document.
     *
     * Idempotent: each container is marked with data-initialized="true" once
     * rendered. Subsequent calls (e.g. after the canvas adds a new tile) skip
     * already-initialized containers, preserving any text the user has typed.
     */
    function init() {
        const containers = document.querySelectorAll('.title-widget');
        containers.forEach(container => {
            if (container.dataset.initialized === 'true') return;

            const title = container.getAttribute('data-title') || '';
            const instructions = container.getAttribute('data-instructions') || '';
            container.innerHTML = createTitleWidget(title, instructions);
            container.dataset.initialized = 'true';
        });
    }

    return {
        init: init
    };
})();

// Expose on window so the canvas controller can re-trigger init() when adding
// new tiles. Every Phase 2 widget does the same.
window.TitleWidget = TitleWidget;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TitleWidget.init);
} else {
    TitleWidget.init();
}