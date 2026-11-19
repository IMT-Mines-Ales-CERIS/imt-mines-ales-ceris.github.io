// @ts-check

import { PALETTE } from './config.js';
import { h } from './util.js';

/**
 * @typedef {import('./hal.js').Publication} Publication
 * @typedef {{ id: string, name: string, count: number, group: number, degree: number }} GraphNode
 * @typedef {{ from: string, to: string, weight: number }} GraphEdge
 * @typedef {{ minPubs: number, maxNodes: number, minWeight: number, maxAuthorsPerPub: number }} GraphOptions
 */

/**
 * Réseau de co-signatures : un nœud par auteur, une arête par paire d'auteurs ayant publié ensemble.
 * Les publications à très nombreuses signatures sont ignorées pour les arêtes (elles forment des cliques peu informatives).
 * @param {Publication[]} pubs
 * @param {GraphOptions} opts
 * @returns {{ nodes: GraphNode[], edges: GraphEdge[] }}
 */
export function buildGraph(pubs, opts) {
    /** @type {Map<string, { name: string, count: number }>} */
    const authors = new Map();
    for (const p of pubs) {
        for (const a of p.authors) {
            const entry = authors.get(a.key) ?? { name: a.name, count: 0 };
            entry.count++;
            authors.set(a.key, entry);
        }
    }

    const kept = new Set([...authors.entries()]
        .filter(([, a]) => a.count >= opts.minPubs)
        .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
        .slice(0, opts.maxNodes)
        .map(([k]) => k));

    /** @type {Map<string, number>} */
    const weights = new Map();
    for (const p of pubs) {
        if (p.authors.length > opts.maxAuthorsPerPub) continue;
        const keys = p.authors.map(a => a.key).filter(k => kept.has(k)).sort();
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const id = `${keys[i]}|${keys[j]}`;
                weights.set(id, (weights.get(id) ?? 0) + 1);
            }
        }
    }

    /** @type {GraphEdge[]} */
    const edges = [];
    /** @type {Map<string, number>} */
    const degree = new Map();
    for (const [id, weight] of weights) {
        if (weight < opts.minWeight) continue;
        const [from, to] = id.split('|');
        edges.push({ from, to, weight });
        degree.set(from, (degree.get(from) ?? 0) + 1);
        degree.set(to, (degree.get(to) ?? 0) + 1);
    }

    const ids = [...kept].filter(k => degree.has(k));
    const groups = detectCommunities(ids, edges);
    /** @type {GraphNode[]} */
    const nodes = ids.map(id => {
        const a = /** @type {{ name: string, count: number }} */ (authors.get(id));
        return { id, name: a.name, count: a.count, group: groups.get(id) ?? 0, degree: degree.get(id) ?? 0 };
    });
    return { nodes, edges };
}

/**
 * Propagation d'étiquettes (déterministe) pour colorer les groupes d'auteurs qui collaborent beaucoup.
 * @param {string[]} ids
 * @param {GraphEdge[]} edges
 * @returns {Map<string, number>} id -> numéro de groupe (0 = plus grand groupe)
 */
export function detectCommunities(ids, edges) {
    /** @type {Map<string, [string, number][]>} */
    const adj = new Map(ids.map(id => [id, []]));
    for (const e of edges) {
        adj.get(e.from)?.push([e.to, e.weight]);
        adj.get(e.to)?.push([e.from, e.weight]);
    }
    const label = new Map(ids.map((id, i) => [id, i]));
    for (let iter = 0; iter < 15; iter++) {
        let changed = false;
        for (const id of ids) {
            /** @type {Map<number, number>} */
            const score = new Map();
            for (const [n, w] of adj.get(id) ?? []) {
                const l = /** @type {number} */ (label.get(n));
                score.set(l, (score.get(l) ?? 0) + w);
            }
            if (!score.size) continue;
            const best = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
            if (best !== label.get(id)) { label.set(id, best); changed = true; }
        }
        if (!changed) break;
    }

    /** @type {Map<number, number>} */
    const sizes = new Map();
    for (const l of label.values()) sizes.set(l, (sizes.get(l) ?? 0) + 1);
    const order = [...sizes.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([l]) => l);
    return new Map([...label.entries()].map(([id, l]) => [id, order.indexOf(l)]));
}

/** @type {any} */
let network = null;

/**
 * @param {HTMLElement} container
 * @param {{ nodes: GraphNode[], edges: GraphEdge[] }} graph
 * @param {(authorKey: string) => void} onSelect
 * @param {HTMLElement} infoBox
 */
export function renderGraph(container, graph, onSelect, infoBox) {
    network?.destroy();
    network = null;
    infoBox.replaceChildren();
    if (!graph.nodes.length) return;

    /** @type {Map<string, GraphNode>} */
    const byId = new Map(graph.nodes.map(n => [n.id, n]));
    /** @type {Map<string, [string, number][]>} */
    const neighbours = new Map(graph.nodes.map(n => [n.id, []]));
    for (const e of graph.edges) {
        neighbours.get(e.from)?.push([e.to, e.weight]);
        neighbours.get(e.to)?.push([e.from, e.weight]);
    }

    // Les infobulles sont passées en éléments DOM : vis-network n'interprète pas de HTML dans ce cas.
    const nodes = graph.nodes.map(n => ({
        id: n.id,
        label: n.name,
        value: n.count,
        title: h('div', { text: `${n.name} — ${n.count} publication(s), ${n.degree} co-auteur(s)` }),
        color: { background: PALETTE[n.group % PALETTE.length], border: '#ffffff', highlight: { background: '#ff7c4d', border: '#153a43' } },
        font: { color: '#153a43', size: 13 },
    }));
    const edges = graph.edges.map(e => ({
        from: e.from, to: e.to, value: e.weight,
        title: h('div', { text: `${e.weight} publication(s) en commun` }),
        color: { color: 'rgba(21,58,67,0.25)', highlight: '#ff7c4d' },
    }));

    // @ts-ignore vis est fourni par le CDN
    network = new vis.Network(container, { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, {
        nodes: { shape: 'dot', scaling: { min: 8, max: 38 } },
        edges: { scaling: { min: 1, max: 8 }, smooth: false },
        physics: { solver: 'forceAtlas2Based', stabilization: { iterations: 200 } },
        interaction: { hover: true, tooltipDelay: 150 },
    });

    network.on('selectNode', (/** @type {{ nodes: string[] }} */ params) => {
        const node = byId.get(params.nodes[0]);
        if (!node) return;
        const co = (neighbours.get(node.id) ?? []).sort((a, b) => b[1] - a[1]).slice(0, 8);
        infoBox.replaceChildren(
            h('strong', { text: node.name }),
            h('span', { class: 'text-muted ms-2', text: `${node.count} publication(s) · ${node.degree} co-auteur(s) affichés` }),
            h('div', { class: 'small mt-1', text: 'Principaux co-auteurs : ' + co.map(([id, w]) => `${byId.get(id)?.name} (${w})`).join(', ') }),
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary mt-2', text: 'Filtrer sur cet auteur', onclick: () => onSelect(node.id) }),
        );
    });
    network.on('deselectNode', () => infoBox.replaceChildren());
}
