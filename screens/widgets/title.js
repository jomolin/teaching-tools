function createTitleWidget(title = '', instructions = '') {
    return `
        <div class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-8 shadow-md">
            <div id="message" 
                 contenteditable="true"
                 class="text-5xl text-center text-gray-900 dark:text-gray-100 min-h-[60px] font-bold border-2 border-transparent p-2.5 rounded-lg cursor-text focus:outline-none focus:border-primary dark:focus:border-blue-400 focus:bg-gray-50 dark:focus:bg-gray-800 empty:before:content-['Click_to_type_message...'] empty:before:text-gray-500 dark:empty:before:text-gray-400"
            >${title}</div>
            <div id="instructions" 
                 contenteditable="true"
                 class="text-xl text-gray-600 dark:text-gray-400 min-h-[40px] border-2 border-transparent p-2.5 rounded-lg cursor-text mt-4 text-left focus:outline-none focus:border-primary dark:focus:border-blue-400 focus:bg-gray-50 dark:focus:bg-gray-800 empty:before:content-['Click_to_add_instructions...'] empty:before:text-gray-500 dark:empty:before:text-gray-400"
            >${instructions}</div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    const containers = document.querySelectorAll('.title-widget');
    containers.forEach(container => {
        const title = container.getAttribute('data-title') || '';
        const instructions = container.getAttribute('data-instructions') || '';
        container.innerHTML = createTitleWidget(title, instructions);
    });
});