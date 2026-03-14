const fs = require('fs');
const path = require('path');

// Configuration
const REPO_ROOT = __dirname;
const OUTPUT_FILE = path.join(REPO_ROOT, 'tools-manifest.json');

// Tool descriptions for better UX
const toolDescriptions = {
    'classroom-screens': {
        'bell-ringers': 'Daily bell ringer activities with special days and curriculum content',
        'classroom': 'Full classroom display with timer, noise meter, and random picker',
        'daily-think': 'Word of the day, number of the day, and daily rotation activities',
        'morning-routine': 'Morning routine display with daily think activities',
        'ssr': 'Silent Sustained Reading mode with timer and noise monitoring'
    },
    'classroom-games': {
        'silent-ball': 'Brain break game with timer and noise meter',
        'reverse-charades': 'Group game with dual random pickers for students and prompts',
        'pass-the-creeper': 'Hot potato style game with categories',
        'this-or-that': 'Movement game of preferences and choices',
        'more-or-less': 'Estimation game with movement',
        '7up': 'Classic classroom game with seven picker tracking',
        'heads-up-7-up': 'Classic classroom game with seven picker tracking'
    },
    'planning': {
        'bsla-tracker': 'Track and plan BSLA lessons and activities',
        'daily-reflection': 'Daily PCT training reflection tool',
        'list-manager': 'Manage shared lists used across all classroom tools',
        'math-tracker': 'Track and plan mathematics lessons for Year 4/5 mixed class',
        'seating-planner': 'Generate balanced seating arrangements and track student pairings'
    }
};

// Tool icons for sidebar — all verified valid Lucide icon names
const toolIcons = {
    'classroom-screens': {
        'bell-ringers': 'bell-ring',
        'classroom': 'school',
        'daily-think': 'lightbulb',
        'morning-routine': 'sunrise',
        'ssr': 'book-open'
    },
    'classroom-games': {
        'silent-ball': 'volume-x',
        'reverse-charades': 'drama',
        'pass-the-creeper': 'bomb',
        'this-or-that': 'arrow-left-right',
        'more-or-less': 'scale',
        '7up': 'hand',
        'heads-up-7-up': 'hand'
    },
    'planning': {
        'bsla-tracker': 'file-text',
        'daily-reflection': 'notebook-pen',
        'list-manager': 'list',
        'math-tracker': 'calculator',
        'seating-planner': 'users'
    }
};

// Category display names and order
const categories = {
    'classroom-screens': {
        name: 'Classroom Screens',
        description: 'Interactive displays for classroom management'
    },
    'classroom-games': {
        name: 'Classroom Games',
        description: 'Interactive games for brain breaks and group activities'
    },
    'planning': {
        name: 'Planning Tools',
        description: 'Lesson planning and tracking'
    }
};

/**
 * Recursively find all HTML files in a directory
 */
function findHtmlFiles(dir, baseDir = dir) {
    const results = [];
    
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const relativePath = path.relative(baseDir, fullPath);
            
            if (item.isDirectory()) {
                // Skip hidden directories and common excludes
                if (!item.name.startsWith('.') && item.name !== 'node_modules') {
                    results.push(...findHtmlFiles(fullPath, baseDir));
                }
            } else if (item.isFile() && item.name.endsWith('.html') && item.name !== 'index.html') {
                results.push(relativePath.replace(/\\/g, '/')); // Normalize path separators
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return results;
}

/**
 * Generate the tools manifest
 */
function generateManifest() {
    console.log('Scanning repository for tools...');
    
    const toolsData = {};
    
    // Get all top-level directories
    const rootItems = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
    const folders = rootItems.filter(item => 
        item.isDirectory() && 
        !item.name.startsWith('.') && 
        item.name !== 'node_modules'
    );
    
    for (const folder of folders) {
        const folderPath = path.join(REPO_ROOT, folder.name);
        
        // Special handling for 'screens' folder (has subfolders)
        if (folder.name === 'screens') {
            const screenItems = fs.readdirSync(folderPath, { withFileTypes: true });
            const subfolders = screenItems.filter(item => item.isDirectory());
            
            for (const subfolder of subfolders) {
                // Skip data and widgets folders
                if (subfolder.name === 'data' || subfolder.name === 'widgets') continue;
                
                const subfolderPath = path.join(folderPath, subfolder.name);
                const htmlFiles = findHtmlFiles(subfolderPath);
                
                if (htmlFiles.length > 0) {
                    toolsData[subfolder.name] = htmlFiles.map(file => {
                        const fileName = path.basename(file, '.html');
                        return {
                            name: fileName,
                            path: `screens/${subfolder.name}/${path.basename(file)}`,
                            folder: subfolder.name,
                            description: toolDescriptions[subfolder.name]?.[fileName] || 'Interactive teaching tool',
                            icon: toolIcons[subfolder.name]?.[fileName] || 'file'
                        };
                    });
                }
            }
        } else {
            // Regular folders (like 'planning')
            const htmlFiles = findHtmlFiles(folderPath);
            
            if (htmlFiles.length > 0) {
                toolsData[folder.name] = htmlFiles.map(file => {
                    const fileName = path.basename(file, '.html');
                    return {
                        name: fileName,
                        path: `${folder.name}/${path.basename(file)}`,
                        folder: folder.name,
                        description: toolDescriptions[folder.name]?.[fileName] || 'Interactive teaching tool',
                        icon: toolIcons[folder.name]?.[fileName] || 'file'
                    };
                });
            }
        }
    }
    
    const manifest = {
        generated: new Date().toISOString(),
        version: '1.0',
        categories: categories,
        tools: toolsData
    };
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    
    console.log('Manifest generated successfully!');
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Found ${Object.keys(toolsData).length} categories`);
    
    // Print summary
    for (const [category, tools] of Object.entries(toolsData)) {
        console.log(`   - ${category}: ${tools.length} tools`);
    }
}

// Run the generator
try {
    generateManifest();
} catch (error) {
    console.error('Error generating manifest:', error);
    process.exit(1);
}