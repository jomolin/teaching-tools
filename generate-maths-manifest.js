const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = __dirname;
const MATHS_DIR = path.join(REPO_ROOT, 'planning', 'data', 'Maths');
const OUTPUT_FILE = path.join(MATHS_DIR, 'manifest.json');

// Book-level "extra" files (revisions, mid/end-year revision) don't belong at
// the end of the book - they fall at a specific point in the real curriculum
// sequence. This table says where each known extra slots in; `order` breaks
// ties between extras anchored to the same chapter (lower runs first).
// Any extra file not listed here just falls back to the end of its book.
const EXTRA_INSERTIONS = {
    '4a/revision_1.json': { afterChapter: '4', order: 0 },
    '4a/revision_2.json': { afterChapter: '7', order: 0 },
    '4a/mid_year_revision.json': { afterChapter: '7', order: 1 },
    '4b/revision_3.json': { afterChapter: '11', order: 0 },
    '4b/revision_4.json': { afterChapter: '15', order: 0 },
    '4b/end_year_revision.json': { afterChapter: '15', order: 1 }
};

/**
 * Scans planning/data/Maths and builds an ordered sequence per book of
 * chapters and extras (revisions, mid/end-year revision), in true curriculum
 * order. Re-run this after rescraping so the tracker picks up new/renamed/
 * removed chapters without any hardcoded file list in the HTML. If a future
 * extra file isn't in EXTRA_INSERTIONS above, it's placed at the end of its
 * book rather than dropped, so rescraping never silently loses content.
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

        const chapterEntries = entries
            .filter(e => e.isDirectory() && e.name.startsWith('Chapter_'))
            .map(e => {
                const file = path.join(bookName, e.name, 'lesson_plans.json').replace(/\\/g, '/');
                if (!fs.existsSync(path.join(MATHS_DIR, file))) return null;
                const chapterId = e.name.replace('Chapter_', '');
                const numeric = /^\d+$/.test(chapterId);
                return {
                    type: 'chapter',
                    id: chapterId,
                    file,
                    // Numbered chapters sort by number; named ones (e.g.
                    // "curriculum-alignment-content") always sort last.
                    sortKey: numeric ? parseInt(chapterId, 10) : Number.MAX_SAFE_INTEGER
                };
            })
            .filter(Boolean);

        const extraEntries = entries
            .filter(e => e.isFile() && e.name.endsWith('.json'))
            .map(e => {
                const file = path.join(bookName, e.name).replace(/\\/g, '/');
                const insertion = EXTRA_INSERTIONS[file];
                const sortKey = insertion
                    ? parseInt(insertion.afterChapter, 10) + 0.01 * (1 + insertion.order)
                    : Number.MAX_SAFE_INTEGER - 1; // falls just before named chapters if unconfigured
                return { type: 'extra', file, sortKey };
            });

        const sequence = [...chapterEntries, ...extraEntries]
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ sortKey, ...rest }) => rest);

        if (sequence.length === 0) {
            console.warn(`   Skipping "${bookName}" - no chapters or data files found`);
            continue;
        }

        books[bookName] = { year, suffix, sequence };
        const chapterCount = chapterEntries.length;
        const extraCount = extraEntries.length;
        console.log(`   ${bookName}: ${chapterCount} chapter(s), ${extraCount} extra file(s)`);
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
