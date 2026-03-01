import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
    'src/index.css',
    'src/App.jsx',
    'src/components/PresetSelector.jsx',
    'src/components/DropZone.jsx',
    'src/components/Controls.jsx',
    'src/components/CanvasPreview.jsx'
];

const replacements = [
    { match: /cyan/g, replace: 'amber' },
    { match: /purple/g, replace: 'orange' },
    { match: /blue/g, replace: 'yellow' },
    { match: /#22d3ee/g, replace: '#fbbf24' }, // cyan-400 to amber-400
    { match: /34,211,238/g, replace: '251,191,36' }, // cyan-400 rgb to amber-400 rgb
    { match: /6,182,212/g, replace: '245,158,11' }, // cyan-500 rgb to amber-500 rgb
    { match: /168,85,247/g, replace: '249,115,22' }, // purple-500 rgb to orange-500 rgb
    { match: /rgba\(34, 211, 238/g, replace: 'rgba(251, 191, 36' }, // index.css cyan rgba
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        replacements.forEach(({ match, replace }) => {
            content = content.replace(match, replace);
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
