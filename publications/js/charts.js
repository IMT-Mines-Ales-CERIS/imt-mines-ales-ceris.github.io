// @ts-check

import { PALETTE, docTypeLabel } from './config.js';

/**
 * @typedef {import('./stats.js').Stats} Stats
 * @typedef {Object} ChartHandlers
 * @property {(year: number) => void} onYear
 * @property {(type: string) => void} onType
 * @property {(authorKey: string) => void} onAuthor
 * @property {(keyword: string) => void} onKeyword
 * @property {(venue: string) => void} onVenue
 */

/** @type {Map<string, any>} */
const charts = new Map();

/** @param {string} label @param {number} max */
const shorten = (label, max = 38) => label.length > max ? `${label.slice(0, max - 1)}…` : label;

/**
 * @param {string} canvasId
 * @param {any} config
 */
function draw(canvasId, config) {
    charts.get(canvasId)?.destroy();
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(canvasId));
    // @ts-ignore Chart est fourni par le CDN
    charts.set(canvasId, new Chart(canvas, config));
}

/**
 * Rend cliquable un graphique : le callback reçoit l'indice de la barre / part cliquée.
 * @param {(index: number) => void} onPick
 */
const clickable = onPick => ({
    onClick: (/** @type {any} */ _e, /** @type {any[]} */ els) => { if (els.length) setTimeout(() => onPick(els[0].index), 0); },
    onHover: (/** @type {any} */ e, /** @type {any[]} */ els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
});

/** @param {string[]} types @param {string} t */
const typeColor = (types, t) => PALETTE[types.indexOf(t) % PALETTE.length];

/**
 * @param {Stats} stats
 * @param {ChartHandlers} on
 */
export function renderCharts(stats, on) {
    // Publications par année, empilées par type
    draw('chart-years', {
        type: 'bar',
        data: {
            labels: stats.years,
            datasets: stats.types.map(t => ({
                label: docTypeLabel(t),
                data: stats.years.map(y => stats.byYearType.get(y)?.get(t) ?? 0),
                backgroundColor: typeColor(stats.types, t),
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
            ...clickable(i => on.onYear(stats.years[i])),
        },
    });

    // Répartition par type
    draw('chart-types', {
        type: 'doughnut',
        data: {
            labels: stats.types.map(docTypeLabel),
            datasets: [{ data: stats.types.map(t => stats.byType.get(t)), backgroundColor: stats.types.map(t => typeColor(stats.types, t)) }],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
            ...clickable(i => on.onType(stats.types[i])),
        },
    });

    /**
     * @param {string} id
     * @param {string[]} labels
     * @param {number[]} values
     * @param {string} color
     * @param {(i: number) => void} onPick
     */
    const hbar = (id, labels, values, color, onPick) => draw(id, {
        type: 'bar',
        data: { labels: labels.map(l => shorten(l)), datasets: [{ data: values, backgroundColor: color }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { title: (/** @type {any[]} */ items) => labels[items[0].dataIndex] } },
            },
            ...clickable(onPick),
        },
    });

    hbar('chart-authors', stats.topAuthors.map(([k]) => stats.authorNames.get(k) ?? k), stats.topAuthors.map(([, n]) => n), PALETTE[0],
        i => on.onAuthor(stats.topAuthors[i][0]));
    hbar('chart-keywords', stats.topKeywords.map(([k]) => k), stats.topKeywords.map(([, n]) => n), PALETTE[1],
        i => on.onKeyword(stats.topKeywords[i][0]));
    hbar('chart-venues', stats.topVenues.map(([v]) => v), stats.topVenues.map(([, n]) => n), PALETTE[2],
        i => on.onVenue(stats.topVenues[i][0]));
}
