const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = __dirname;
const MATHS_DIR = path.join(REPO_ROOT, 'planning', 'data', 'Maths');
const OUTPUT_FILE = path.join(MATHS_DIR, 'manifest.json');

/**
 * Scans planning/data/Maths and builds an index of every book (e.g. "4a"),
 * its chapter files, and any book-level extras (mid/end-year revision).
 * Re-run this after rescraping so the tracker picks up new/renamed/removed
 * chapters without any hardcoded file list in the HTML.
 */
function generateMathsManifest() {
    if (!fs.existsSync(MATHS_DIR)) {
        console.error(`Maths data directory not found: ${MATHS_DIR}`);
        process.exit(1);
    }

    console.log('Scanning Maths data directory...');

    const books = {};
    const bookDirs = fs.readdirSync(MATHS_DIR, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort();

    for (const bookName of bookDirs) {
        // Book folders are named "<year><suffix>", e.g. "4a", "4b", "5a".
        const match = bookName.match(/^(\d+)([a-zA-Z]*)$/);
        if (!match) {
            console.warn(`   Skipping "${bookName}" - doesn't match the <year><suffix> naming convention`);
            continue;
        }
        const [, year, suffix] = match;
        const bookPath = path.join(MATHS_DIR, bookName);
        const entries = fs.readdirSync(bookPath, { withFileTypes: true });

        const chapters = entries
            .filter(e => e.isDirectory() && e.name.startsWith('Chapter_'))
            .map(e => {
                const file = path.join(bookName, e.name, 'lesson_plans.json');
                if (!fs.existsSync(path.join(MATHS_DIR, file))) return null;
                const chapterId = e.name.replace('Chapter_', '');
                const numeric = /^\d+$/.test(chapterId);
                return {
                    id: chapterId,
                    file: file.replace(/\\/g, '/'),
                    // Numbered chapters sort first by number; named ones (e.g.
                    // "curriculum-alignment-content") sort after, in folder order.
                    sortKey: numeric ? parseInt(chapterId, 10) : Number.MAX_SAFE_INTEGER
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.sortKey - b.sortKey);

        const extras = entries
            .filter(e => e.isFile() && e.name.endsWith('.json'))
            .map(e => path.join(bookName, e.name).replace(/\\/g, '/'));

        if (chapters.length === 0 && extras.length === 0) {
            console.warn(`   Skipping "${bookName}" - no chapters or data files found`);
            continue;
        }

        books[bookName] = { year, suffix, chapters, extras };
        console.log(`   ${bookName}: ${chapters.length} chapter(s), ${extras.length} extra file(s)`);
    }

    const manifest = {
        generated: new Date().toISOString(),
        books
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`Maths manifest written to ${OUTPUT_FILE}`);
}

try {
    generateMathsManifest();
} catch (error) {
    console.error('Error generating Maths manifest:', error);
    process.exit(1);
}
