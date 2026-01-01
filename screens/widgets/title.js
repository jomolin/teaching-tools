function createTitleWidget(title = '', instructions = '') {
    return `
            <div class="message-box" style="box-shadow: none; padding: 0; margin: 0;">
                <div id="message" contenteditable="true">${title}</div>
                <div id="instructions" contenteditable="true">${instructions}</div>
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