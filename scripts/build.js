
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORY_FILE = path.join(__dirname, '../game/story/main.yaml');
const OUTPUT_FILE = path.join(__dirname, '../game/build/story.json');
const ASSETS_DIR = path.join(__dirname, '../game/assets');
const PUBLIC_DIR = path.join(__dirname, '../public'); // For backward compatibility/testing

console.log('Building story from:', STORY_FILE);

try {
    const fileParams = fs.readFileSync(STORY_FILE, 'utf8');
    const story = yaml.parse(fileParams);

    console.log('Story title:', story.title);
    console.log('Assets defined:',
        (Object.keys(story.assets?.backgrounds || {}).length) +
        (Object.keys(story.assets?.characters || {}).length)
    );

    if (!story.nodes || !Array.isArray(story.nodes)) {
        throw new Error('Invalid story: nodes array missing');
    }

    // Asset Resolution Strategy
    const resolveAsset = (assetPath) => {
        // If it's a relative path in YAML (e.g. "Scene/lake.png")

        // Check game/assets
        if (fs.existsSync(path.join(ASSETS_DIR, assetPath))) {
            return assetPath;
        }

        // Check public (fallback)
        if (fs.existsSync(path.join(PUBLIC_DIR, assetPath))) {
            return assetPath;
        }

        // Warn but return anyway
        // console.warn(`Warning: Asset not found locally: ${assetPath}`);
        return assetPath;
    };

    const runtimeNodes = [];
    const runtimeEdges = [];

    story.nodes.forEach(node => {
        // Create ReactFlow Node
        const rfNode = {
            id: node.id,
            type: node.type,
            position: node.position || { x: 0, y: 0 },
            data: {
                title: node.title,
                events: node.events ? node.events.map(ev => ({
                    ...ev,
                    id: ev.id || `ev-${Math.random().toString(36).substr(2, 9)}`, // ensure IDs
                    // If event has characterImageId, map it (conceptually, already mapped in char definition)
                })) : [],
                choices: node.choices?.map(c => ({
                    id: c.id || `c-${Math.random().toString(36).substr(2, 5)}`,
                    text: c.text,
                    nextNodeId: c.next
                })),
                // Resolve background ID to Path
                backgroundImage: node.background ? resolveAsset(story.assets.backgrounds[node.background] || node.background) : undefined
            }
        };

        runtimeNodes.push(rfNode);

        // Create Edge if 'next' is defined
        if (node.next) {
            runtimeEdges.push({
                id: `e-${node.id}-${node.next}`,
                source: node.id,
                target: node.next,
                animated: true
            });
        }
    });

    const output = {
        nodes: runtimeNodes,
        edges: runtimeEdges,
        characters: story.characters.map(c => ({
            ...c,
            images: c.images.map(img => ({
                ...img,
                // Lookup asset ID in map, or use value if not found
                url: story.assets.characters[img.assetId] ? resolveAsset(story.assets.characters[img.assetId]) : img.assetId
            }))
        })),
        version: story.version,
        lastSaved: new Date().toISOString()
    };

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log('Build complete:', OUTPUT_FILE);

} catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
}
