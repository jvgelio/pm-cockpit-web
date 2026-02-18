const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TEAMS_DIR = path.join(__dirname, '..', 'pm-data', 'teams');

function migrateTeam(filePath) {
    console.log(`Checking ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
        try {
            let data = yaml.load(match[1]) || {};
            const body = match[2].trim();

            if (data.members) {
                console.log(`Removing members from ${filePath}...`);
                delete data.members;
                const yamlStr = yaml.dump(data, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
                const newContent = `---\n${yamlStr}---\n\n${body}`;
                fs.writeFileSync(filePath, newContent, 'utf8');
            } else {
                console.log(`${filePath} has no members field.`);
            }
        } catch (e) {
            console.error(`Error parsing frontmatter in ${filePath}:`, e);
        }
    }
}

if (fs.existsSync(TEAMS_DIR)) {
    const files = fs.readdirSync(TEAMS_DIR);
    for (const file of files) {
        if (file.endsWith('.md')) {
            migrateTeam(path.join(TEAMS_DIR, file));
        }
    }
} else {
    console.error(`Teams directory not found: ${TEAMS_DIR}`);
}
