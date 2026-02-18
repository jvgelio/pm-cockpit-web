const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DATA_DIR = path.join(__dirname, '..', 'pm-data');
const CYCLES_DIR = path.join(DATA_DIR, 'cycles');
const BACKLOG_DIR = path.join(DATA_DIR, 'backlog');

function migrateFile(filePath) {
    console.log(`Checking ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    let data = {};
    let body = content;

    if (match) {
        try {
            data = yaml.load(match[1]) || {};
            body = match[2].trim();
        } catch (e) {
            console.error(`Error parsing frontmatter in ${filePath}:`, e);
            return;
        }
    } else {
        body = content.trim();
    }

    let changed = false;

    // Mandatory fields
    if (!data.title) {
        data.title = path.basename(filePath, '.md').replace(/^ini-\d+-/, '').replace(/-/g, ' ');
        changed = true;
    }
    if (!data.status) {
        data.status = 'draft';
        changed = true;
    }
    if (!data.priority) {
        data.priority = 'medium';
        changed = true;
    }
    if (!data.type) {
        data.type = 'product';
        changed = true;
    }

    // Ensure body is not empty
    if (!body) {
        body = '## Descrição\n\n*Sem descrição formal ainda.*';
        changed = true;
    }

    if (changed) {
        console.log(`Migrating ${filePath}...`);
        const yamlStr = yaml.dump(data, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
        const newContent = `---\n${yamlStr}---\n\n${body}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
    } else {
        console.log(`${filePath} is already in correct format.`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.md') && !file.startsWith('_')) {
            migrateFile(fullPath);
        }
    }
}

console.log('Starting migration...');
walkDir(CYCLES_DIR);
walkDir(BACKLOG_DIR);
console.log('Migration finished!');
