// Title Widget Module - Markdown edition (Phase 2)
// =====================================================================
// A single markdown editable area per instance. Click to edit raw markdown,
// blur (or Ctrl+Enter) to re-render. Per-instance state persisted to
// localStorage so multiple instances on the same page (e.g. on the canvas)
// each keep their own content.
//
// Supported markdown (Obsidian-flavored subset):
//   # ## ### #### #####   Headings
//   **bold**              Bold
//   _italic_              Italic (also *italic*)
//   ~~strike~~            Strikethrough
//   ==highlight==         Highlight (custom marked extension)
//   - item / * item       Unordered list
//   1. 2. 3. item         Ordered list
//   - [ ] / - [x] item    Task list checkboxes
//   `code`                Inline code
//   > quote               Blockquote
//   ---                   Horizontal rule
//
// HTML is escaped by marked to prevent XSS / unwanted styling.
//
// Backwards compatibility with Phase 1 screens:
//   - data-content="..."          NEW preferred attribute (raw markdown)
//   - data-title + data-instructions   OLD attributes still supported and
//                                       auto-migrated into a single markdown
//                                       string on first init
//
// Existing screens (classroom.html, ssr.html, etc.) do NOT need to change.

const TitleWidget = (function() {
    'use strict';

    const STORAGE_PREFIX = 'titleWidget_';
    let instanceCounter = 0;

    // Page slug derived from URL pathname so different host pages (classroom.html,
    // ssr.html, the canvas, etc.) get separate state buckets and don't trample
    // each other's title content. Matches the convention used elsewhere in the
    // codebase (widgetState_{pageslug}_{instanceId}).
    const PAGE_SLUG = (function() {
        try {
            const path = window.location.pathname || '';
            const file = path.split('/').pop() || 'index';
            return file.replace(/\.html?$/i, '') || 'index';
        } catch (e) {
            return 'index';
        }
    })();

    // ----- Marked.js loading --------------------------------------------------
    // Marked is loaded from CDN lazily so existing host HTML pages don't need
    // an extra <script> tag. Until marked finishes loading we render the raw
    // text as a fallback.
    let markedReady = null;
    function loadMarked() {
        if (markedReady) return markedReady;
        if (typeof marked !== 'undefined') {
            markedReady = Promise.resolve();
            configureMarked();
            return markedReady;
        }
        markedReady = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked@13.0.3/marked.min.js';
            script.onload = () => { configureMarked(); resolve(); };
            script.onerror = () => reject(new Error('Failed to load marked.js'));
            document.head.appendChild(script);
        });
        return markedReady;
    }

    // Configure marked once it's available:
    //  - enable GFM (strikethrough, task lists)
    //  - add a custom inline extension for ==highlight==
    function configureMarked() {
        if (typeof marked === 'undefined') return;
        try {
            marked.use({
                extensions: [{
                    name: 'highlight',
                    level: 'inline',
                    start(src) { return src.indexOf('=='); },
                    tokenizer(src) {
                        const match = src.match(/^==([^=\n]+?)==/);
                        if (match) {
                            return {
                                type: 'highlight',
                                raw: match[0],
                                text: match[1],
                                tokens: this.lexer.inlineTokens(match[1])
                            };
                        }
                    },
                    renderer(token) {
                        return '<mark>' + this.parser.parseInline(token.tokens) + '</mark>';
                    }
                }],
                gfm: true,
                breaks: false
            });
        } catch (e) {
            console.error('Marked configuration failed:', e);
        }
    }

    // Render a markdown string to HTML. Synchronous fallback if marked hasn't
    // loaded yet returns the raw text in a <pre>.
    function renderMarkdown(md) {
        if (typeof marked === 'undefined') {
            const esc = (md || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return '<pre class="whitespace-pre-wrap">' + esc + '</pre>';
        }
        try {
            return marked.parse(md || '', { mangle: false, headerIds: false });
        } catch (e) {
            console.error('Markdown parse failed:', e);
            return '<pre class="whitespace-pre-wrap text-red-600">Render error: ' + e.message + '</pre>';
        }
    }

    // ----- Migration from data-title + data-instructions ---------------------
    function migrateLegacyAttrs(container) {
        const legacyTitle = container.getAttribute('data-title');
        const legacyInstr = container.getAttribute('data-instructions');
        if (legacyTitle === null && legacyInstr === null) return null;

        let md = '';
        if (legacyTitle) md += '# ' + legacyTitle.trim() + '\n\n';
        if (legacyInstr) md += htmlListsToMarkdown(legacyInstr);
        return md.trim();
    }

    // Convert <ol>/<ul>/<li> snippets (the only HTML the old data-instructions
    // attribute supported in practice) into markdown.
    function htmlListsToMarkdown(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return walkToMarkdown(temp, 0).trim() + '\n';
    }
    function walkToMarkdown(node, depth) {
        let out = '';
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                out += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'ol' || tag === 'ul') {
                    let idx = 1;
                    child.childNodes.forEach(li => {
                        if (li.nodeType === Node.ELEMENT_NODE && li.tagName.toLowerCase() === 'li') {
                            const prefix = ' '.repeat(depth * 2) + (tag === 'ol' ? (idx++ + '. ') : '- ');
                            out += prefix + walkToMarkdown(li, depth + 1).trim() + '\n';
                        }
                    });
                } else if (tag === 'br') {
                    out += '\n';
                } else if (tag === 'strong' || tag === 'b') {
                    out += '**' + walkToMarkdown(child, depth) + '**';
                } else if (tag === 'em' || tag === 'i') {
                    out += '_' + walkToMarkdown(child, depth) + '_';
                } else {
                    out += walkToMarkdown(child, depth);
                }
            }
        });
        return out;
    }

    // ----- Per-instance state -------------------------------------------------
    function storageKey(instanceId) {
        return STORAGE_PREFIX + PAGE_SLUG + '_' + instanceId;
    }
    function loadContent(instanceId, defaultMd) {
        try {
            const raw = localStorage.getItem(storageKey(instanceId));
            return raw === null ? defaultMd : raw;
        } catch (e) {
            return defaultMd;
        }
    }
    function saveContent(instanceId, content) {
        try { localStorage.setItem(storageKey(instanceId), content); } catch (e) {}
    }

    // ----- Rendering ----------------------------------------------------------
    function buildShell() {
        return `
            <div class="title-widget-card bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm h-full flex flex-col overflow-hidden">
                <div class="title-widget-rendered flex-1 min-h-0 overflow-auto cursor-text rounded-md p-2 max-w-none
                            [&>:first-child]:mt-0
                            [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-3 [&_h1]:text-gray-900 dark:[&_h1]:text-gray-100
                            [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100
                            [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-gray-800 dark:[&_h3]:text-gray-200
                            [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-gray-800 dark:[&_h4]:text-gray-200
                            [&_h5]:text-lg [&_h5]:font-semibold [&_h5]:mt-2 [&_h5]:mb-1 [&_h5]:text-gray-700 dark:[&_h5]:text-gray-300
                            [&_p]:text-lg [&_p]:my-2 [&_p]:text-gray-700 dark:[&_p]:text-gray-300
                            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2 [&_ul]:text-lg [&_ul]:text-gray-700 dark:[&_ul]:text-gray-300
                            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2 [&_ol]:text-lg [&_ol]:text-gray-700 dark:[&_ol]:text-gray-300
                            [&_li]:my-1
                            [&_li>input[type=checkbox]]:mr-2 [&_li>input[type=checkbox]]:align-middle
                            [&_ul:has(>li>input[type=checkbox])]:list-none [&_ul:has(>li>input[type=checkbox])]:ml-2
                            [&_strong]:font-bold [&_strong]:text-gray-900 dark:[&_strong]:text-gray-100
                            [&_em]:italic
                            [&_del]:line-through [&_del]:opacity-70
                            [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-700/60 [&_mark]:text-gray-900 dark:[&_mark]:text-gray-100 [&_mark]:px-0.5 [&_mark]:rounded
                            [&_code]:bg-gray-100 dark:[&_code]:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 dark:[&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 dark:[&_blockquote]:text-gray-400
                            [&_hr]:border-gray-300 dark:[&_hr]:border-gray-600 [&_hr]:my-4
                            empty:before:content-['Click_to_add_content...'] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:italic"></div>
                <textarea class="title-widget-editor hidden flex-1 min-h-0 w-full p-2 text-base font-mono
                                 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                                 border-2 border-blue-500 rounded-md
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="# Heading&#10;**bold**, _italic_, ~~strike~~, ==highlight==&#10;- bullet&#10;1. ordered&#10;- [ ] task"
                          spellcheck="false"></textarea>
                <div class="title-widget-hint hidden text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                    Click away or press Ctrl+Enter to save &middot; Esc to cancel
                </div>
            </div>
        `;
    }

    function renderInto(container, content) {
        const rendered = container.querySelector('.title-widget-rendered');
        if (!rendered) return;
        const trimmed = (content || '').trim();
        if (trimmed === '') {
            rendered.innerHTML = '';
        } else {
            rendered.innerHTML = renderMarkdown(content);
        }
    }

    function attachEvents(container, instanceId) {
        const rendered = container.querySelector('.title-widget-rendered');
        const editor = container.querySelector('.title-widget-editor');
        const hint = container.querySelector('.title-widget-hint');

        function enterEditMode() {
            editor.value = loadContent(instanceId, '');
            rendered.classList.add('hidden');
            editor.classList.remove('hidden');
            hint.classList.remove('hidden');
            requestAnimationFrame(() => {
                editor.focus();
                // Place caret at end - feels more natural than select-all
                editor.setSelectionRange(editor.value.length, editor.value.length);
            });
        }

        function exitEditMode() {
            const newContent = editor.value;
            saveContent(instanceId, newContent);
            renderInto(container, newContent);
            editor.classList.add('hidden');
            hint.classList.add('hidden');
            rendered.classList.remove('hidden');
        }

        rendered.addEventListener('click', e => {
            // Don't enter edit mode if the user clicked a task checkbox or link
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
            enterEditMode();
        });

        editor.addEventListener('blur', exitEditMode);
        editor.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                editor.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Restore last-saved value without writing the abandoned edit
                editor.value = loadContent(instanceId, '');
                editor.blur();
            }
        });

        // Task list checkbox interaction: persist the toggle back to markdown
        rendered.addEventListener('change', e => {
            if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;
            const allBoxes = Array.from(rendered.querySelectorAll('input[type=checkbox]'));
            const idx = allBoxes.indexOf(e.target);
            if (idx < 0) return;
            const md = loadContent(instanceId, '');
            let count = 0;
            const updated = md.replace(/\[( |x|X)\]/g, (m, ch) => {
                if (count === idx) {
                    count++;
                    return e.target.checked ? '[x]' : '[ ]';
                }
                count++;
                return m;
            });
            saveContent(instanceId, updated);
        });
    }

    /**
     * Initialize all title widgets in the document.
     * Idempotent: containers marked data-initialized="true" are skipped.
     */
    function init() {
        const pending = loadMarked();

        const containers = document.querySelectorAll('.title-widget');
        containers.forEach(container => {
            if (container.dataset.initialized === 'true') return;
            container.dataset.initialized = 'true';

            // Prefer the container's own id so storage keys are stable across
            // reloads (the canvas sets ids on tiles for this reason).
            const instanceId = container.id || ('title-' + (++instanceCounter));

            container.innerHTML = buildShell();

            // Resolve initial content:
            //   1. localStorage (previous edits)
            //   2. data-content attribute (new)
            //   3. legacy data-title + data-instructions (migrated)
            //   4. empty
            let initialContent = null;
            try {
                initialContent = localStorage.getItem(storageKey(instanceId));
            } catch (e) {}

            if (initialContent === null) {
                const dataContent = container.getAttribute('data-content');
                if (dataContent !== null) {
                    initialContent = dataContent;
                } else {
                    const migrated = migrateLegacyAttrs(container);
                    if (migrated !== null) {
                        initialContent = migrated;
                        saveContent(instanceId, initialContent);
                    } else {
                        initialContent = '';
                    }
                }
            }

            renderInto(container, initialContent);
            attachEvents(container, instanceId);

            // Re-render once marked.js loads if it wasn't ready in time
            pending.then(() => renderInto(container, loadContent(instanceId, initialContent)))
                   .catch(err => console.error('Title widget: marked failed to load:', err));
        });
    }

    return {
        init: init
    };
})();

window.TitleWidget = TitleWidget;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TitleWidget.init);
} else {
    TitleWidget.init();
}