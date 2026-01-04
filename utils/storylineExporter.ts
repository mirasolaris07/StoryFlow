import { Node, Edge } from 'reactflow';
import { NodeData, NodeType, EventType, Character, AudioAsset, Attribute } from '../types';
import { stringify } from 'yaml';

interface ExportContext {
    visited: Set<string>;
    output: any[];
    currentBgm: string | null;
    characters: Character[];
    audioAssets: AudioAsset[];
    attributes: Attribute[];
    format: 'yaml' | 'markdown';
    mdBuffer: string[];
    // Track topology
    inDegrees: Map<string, number>;
    originalInDegrees: Map<string, number>;
}

// Helper: Normalize node ID for labels (remove weird chars)
const normalizeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_');

const resolveCharName = (id: string | undefined, chars: Character[]) => {
    const c = chars.find(x => x.id === id);
    return c ? c.name : "Narrator";
};

const resolveAudioName = (id: string | undefined, assets: AudioAsset[]) => {
    const a = assets.find(x => x.id === id);
    return a ? `audio/${a.name}` : id;
};

const resolveConditionString = (condition: any, attributes: Attribute[], characters: Character[]) => {
    if (!condition) return "";

    // New Recursive Logic System
    if (condition.type) {
        const parseLogic = (c: any): string => {
            if (c.type === 'GROUP') {
                if (!c.conditions || c.conditions.length === 0) return "";
                const sub = (c.conditions || []).map(parseLogic).filter((s: string) => s);
                if (sub.length === 0) return "";
                const joined = sub.join(` ${c.operator?.toLowerCase() || 'and'} `);
                return sub.length > 1 ? `(${joined})` : joined;
            } else {
                // STATEMENT
                const attr = attributes.find(a => a.id === c.attributeId);
                if (!attr) return "true"; // Fallback

                // Construct variable name: "character.name.attr" or "game.attr"
                let varName = c.attributeId; // Default fallback
                if (c.scope === 'GAME') {
                    varName = `game.${attr.name}`;
                } else if (c.scope === 'CHARACTER') {
                    const char = characters.find(ch => ch.id === c.targetId);
                    varName = char ? `character.${char.name.toLowerCase()}.${attr.name}` : `character.unknown.${attr.name}`;
                }

                return `${varName} ${c.comparison} ${c.value}`;
            }
        };
        const result = parseLogic(condition);
        return result ? ` if ${result}` : "";
    }

    // Legacy Support
    const attr = attributes.find(a => a.id === condition.attributeId);
    const attrName = attr ? attr.name : condition.attributeId;
    return ` if ${attrName} ${condition.op} ${condition.val}`;
};

const computeInDegrees = (nodes: Node[], edges: Edge[]) => {
    const counts = new Map<string, number>();
    nodes.forEach(n => counts.set(n.id, 0));
    edges.forEach(e => {
        const current = counts.get(e.target) || 0;
        counts.set(e.target, current + 1);
    });
    return counts;
};

export const generateStoryline = (
    nodes: Node[],
    edges: Edge[],
    characters: Character[],
    audioAssets: AudioAsset[],
    attributes: Attribute[],
    format: 'yaml' | 'markdown' = 'yaml'
) => {
    const originalInDegrees = computeInDegrees(nodes, edges);

    // Convert Map<string, number> to a fresh Mutable Map for traversal
    const inDegrees = new Map(originalInDegrees);

    const context: ExportContext = {
        visited: new Set(),
        output: [],
        currentBgm: null,
        characters,
        audioAssets,
        attributes,
        format,
        mdBuffer: [],
        inDegrees,
        originalInDegrees
    };

    const startNode = nodes.find(n => n.type === 'START');
    if (!startNode) return format === 'yaml' ? stringify({ error: "No Start Node Found" }) : "# Error: No Start Node Found";

    if (format === 'markdown') {
        context.mdBuffer.push(`# Storyline Script`);
        context.mdBuffer.push(`*Generated: ${new Date().toLocaleString()}*`);
    }

    traverseNode(startNode.id, nodes, edges, context);

    if (format === 'markdown') return context.mdBuffer.join('\n');
    return stringify(context.output);
};

// Returns the ID of a "Merge Node" that became ready during this traversal, but was NOT visited because we were in a branch.
// Or null if the local chain simply ended or looped.
const traverseNode = (
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
    context: ExportContext
): string | null => {
    if (context.visited.has(nodeId)) {
        // Cycle detected or Jump
        if (context.format === 'yaml') {
            context.output.push({ jump: normalizeId(nodeId) });
        } else {
            context.mdBuffer.push(`\n**[Jump to: ${normalizeId(nodeId)}]**`);
        }
        return null;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Mark visited
    context.visited.add(nodeId);

    const data = node.data as NodeData;
    const label = normalizeId(nodeId);

    // --- NODE PROCESSING (Render) ---
    // (Skipping detailed implementation of every node type rendering for brevity, keeping core logic)
    // --- SCENE NODE RENDER ---
    if (node.type === NodeType.SCENE) {
        const sceneBlock: any = { label };
        if (data.backgroundImage) {
            sceneBlock.scene = data.backgroundImage;
            if (context.format === 'markdown') {
                context.mdBuffer.push(`\n### Scene: ${label}`);
                context.mdBuffer.push(`![${data.backgroundImage}](${data.backgroundImage})`);
                context.mdBuffer.push(`*Background: ${data.backgroundImage}*`);
            }
        } else if (context.format === 'markdown') {
            context.mdBuffer.push(`\n### Scene: ${label}`);
        }

        const lines: any[] = [];
        if (data.events) {
            for (const event of data.events) {
                if (event.type === EventType.MUSIC_CHANGE && event.audioAssetId) {
                    if (event.audioAssetId === 'STOP') {
                        if (context.currentBgm !== 'STOP') {
                            lines.push({ music: null });
                            if (context.format === 'markdown') context.mdBuffer.push(`\n> 🛑 **Music Stopped**`);
                            context.currentBgm = 'STOP';
                        }
                    } else if (context.currentBgm !== event.audioAssetId) {
                        const musicName = resolveAudioName(event.audioAssetId, context.audioAssets);
                        lines.push({ music: musicName });
                        if (context.format === 'markdown') context.mdBuffer.push(`\n> 🎵 **Music:** ${musicName}`);
                        context.currentBgm = event.audioAssetId;
                    }
                }
                else if (event.type === EventType.DIALOGUE || event.type === EventType.NARRATION) {
                    const charName = event.type === EventType.NARRATION ? "Narrator" : resolveCharName(event.characterId, context.characters);
                    const voiceSuffix = event.voiceAssetId ? " 🎙️" : "";
                    if (charName === "Narrator") {
                        const text = `${event.text}${voiceSuffix}`;
                        lines.push(text);
                        if (context.format === 'markdown') context.mdBuffer.push(`\n> ${text}`);
                    } else {
                        const text = `${event.text}${voiceSuffix}`;
                        lines.push({ [charName]: text });
                        if (context.format === 'markdown') context.mdBuffer.push(`\n**${charName}**: ${text}`);
                    }
                }
                else if (event.type === EventType.ATTR_MOD) {
                    const attr = context.attributes.find(a => a.id === event.attributeTargetId);
                    if (attr) {
                        const op = event.operation === 'SET' ? '=' : (event.operation === 'ADD' ? '+=' : (event.operation === 'SUB' ? '-=' : '='));
                        const val = event.attributeFormula || event.attributeValue || 0;
                        lines.push({ set: `${attr.name} ${op} ${val}` });
                        if (context.format === 'markdown') context.mdBuffer.push(`\n> ⚙️ **Set:** ${attr.name} ${op} ${val}`);
                    }
                }
            }
        }
        if (lines.length > 0) sceneBlock.script = lines;
        if (context.format === 'yaml') context.output.push(sceneBlock);
    }
    else if (node.type === NodeType.LOGIC) {
        // Logic Node Rendering handled in traversal
        if (context.format === 'markdown') context.mdBuffer.push(`\n---\n**🔍 Choices:**`);
    }
    else if (node.type === NodeType.SETTER) {
        const lines: any[] = [];
        if (data.events) {
            for (const event of data.events) {
                if (event.type === EventType.ATTR_MOD) {
                    const attr = context.attributes.find(a => a.id === event.attributeTargetId);
                    if (attr) {
                        const op = event.operation === 'SET' ? '=' : (event.operation === 'ADD' ? '+=' : (event.operation === 'SUB' ? '-=' : '='));
                        const val = event.attributeFormula || event.attributeValue || 0;
                        lines.push({ set: `${attr.name} ${op} ${val}` });
                        if (context.format === 'markdown') context.mdBuffer.push(`\n> ⚙️ **Variable Update:** ${attr.name} ${op} ${val}`);
                    }
                }
            }
        }
        if (lines.length > 0 && context.format === 'yaml') {
            context.output.push({ label, script: lines });
        }
    }
    else if (node.type === NodeType.MENU) {
        if (context.format === 'yaml') {
            context.output.push({ label, title: data.title, subtitle: data.subtitle });
        } else {
            context.mdBuffer.push(`\n# Title: ${data.title}\n*${data.subtitle}*`);
        }
    }

    // --- TRAVERSAL LOGIC ---

    // 1. Identify Transitions
    let successors: string[] = [];

    if (node.type === NodeType.LOGIC) {
        const menuBlock: any = { label, menu: [] };

        let pendingContinuation: string | null = null;

        if (data.choices) {
            for (const choice of data.choices) {
                if (!choice.nextNodeId) continue;

                // DECREMENT target in-degree
                const targetId = choice.nextNodeId;
                const currentDegree = (context.inDegrees.get(targetId) || 0) - 1;
                context.inDegrees.set(targetId, currentDegree);

                const conditionStr = resolveConditionString(choice.logicRoot, context.attributes, context.characters);
                const choiceLabel = `${choice.text}${conditionStr}`;

                // --- BRANCH CONTEXT ---
                const branchOutput: any[] = [];
                const branchContext = { ...context, output: branchOutput };

                if (context.format === 'markdown') context.mdBuffer.push(`\n#### Option: ${choiceLabel}`);

                // Check DFS Criteria
                // If currentDegree == 0, we can visit.
                // If originally > 1, this target is a Merge Node.
                const originalDegree = context.originalInDegrees.get(targetId) || 0;

                if (currentDegree === 0) {
                    if (originalDegree > 1) {
                        // We unlocked a Merge Node!
                        // But we are inside a branch. We should NOT visit it here.
                        // We track it as a continuation for the parent.
                        if (!pendingContinuation) pendingContinuation = targetId;
                    } else {
                        // Regular node (degree=1), or end of branch (0).
                        // Recursively visit.
                        // If *that* traversal returns a continuation, we bubble it up?
                        // For a linear branch, any future merge node is also OUR continuation if we are the only path left.
                        const result = traverseNode(targetId, nodes, edges, branchContext);
                        if (result && !pendingContinuation) pendingContinuation = result;
                    }
                } else {
                    // Degree > 0: Still waiting for other branches.
                    // Stop traversal here. Equivalent to "Jump To MergePoint".
                    if (context.format === 'yaml') branchOutput.push({ jump: normalizeId(targetId) });
                    if (context.format === 'markdown') branchContext.mdBuffer.push(`\n*(Continues to ${normalizeId(targetId)})*`);
                }

                if (branchOutput.length === 0 && context.format === 'yaml') branchOutput.push("pass");

                const choiceObj: any = {};
                choiceObj[choiceLabel] = branchOutput;
                menuBlock.menu.push(choiceObj);
            }
        }

        if (context.format === 'yaml') context.output.push(menuBlock);

        // --- HANDLE CONTINUATION ---
        // If one of the branches unlocked a Merge Node, we visit it NOW (Deindented).
        if (pendingContinuation) {
            return traverseNode(pendingContinuation, nodes, edges, context);
        }

        return null; // End of Logic Node
    }
    else {
        // Linear Node (Scene, Start, Setter, etc.)
        const outgoing = edges.filter(e => e.source === nodeId);
        if (outgoing.length === 0) return null; // End of flow

        const targetId = outgoing[0].target;

        // DECREMENT
        const currentDegree = (context.inDegrees.get(targetId) || 0) - 1;
        context.inDegrees.set(targetId, currentDegree);
        const originalDegree = context.originalInDegrees.get(targetId) || 0;

        if (currentDegree === 0) {
            // We unlocked it.
            if (originalDegree > 1) {
                // It's a Merge Node that WE unlocked.
                // We are in a linear chain.
                // If we came from a parent who called us recursively (inside a branch),
                // we should RETURN this targetId so the parent can deindent it?
                // OR, since we are linear, we can just continue visiting it?

                // User Requirement: "put the merging node with 1 deindentation"
                // "1 deindentation" is relative to the *branch*.
                // If we are linear (Scene A -> Scene B), there is no indentation.
                // So we continue visiting.

                // BUT: If Scene B was a merge node from Logic X, and we are inside Logic X's Branch A...
                // Then traverseNode was called by Logic X.
                // If we recurse here, Scene B goes into Branch A's output.
                // We WANT to return it to Logic X.
                return targetId;
            } else {
                // Regular linear node. Visit immediately.
                return traverseNode(targetId, nodes, edges, context);
            }
        } else {
            // Blocked. Stop.
            if (context.format === 'yaml') context.output.push({ jump: normalizeId(targetId) });
            if (context.format === 'markdown') context.mdBuffer.push(`\n*(Continues to ${normalizeId(targetId)})*`);
            return null;
        }
    }
};

