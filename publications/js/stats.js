// @ts-check

import { topN } from './util.js';

/**
 * @typedef {import('./hal.js').Publication} Publication
 * @typedef {Object} Stats
 * @property {number} total
 * @property {number} authorCount
 * @property {number} avgAuthors
 * @property {number|null} firstYear
 * @property {number|null} lastYear
 * @property {number[]} years
 * @property {string[]} types                 types présents, par effectif décroissant
 * @property {Map<number, Map<string, number>>} byYearType
 * @property {Map<string, number>} byType
 * @property {[string, number][]} topAuthors  [clé, effectif]
 * @property {Map<string, string>} authorNames clé -> nom
 * @property {[string, number][]} topKeywords
 * @property {[string, number][]} topVenues
 */

/**
 * @param {Publication[]} pubs
 * @param {{ topAuthors?: number, topKeywords?: number, topVenues?: number }} [limits]
 * @returns {Stats}
 */
export function computeStats(pubs, limits = {}) {
    /** @type {Map<number, Map<string, number>>} */
    const byYearType = new Map();
    /** @type {Map<string, number>} */
    const byType = new Map();
    /** @type {Map<string, number>} */
    const authors = new Map();
    /** @type {Map<string, string>} */
    const authorNames = new Map();
    /** @type {Map<string, number>} */
    const keywords = new Map();
    /** @type {Map<string, number>} */
    const venues = new Map();
    let authorships = 0;

    for (const p of pubs) {
        byType.set(p.docType, (byType.get(p.docType) ?? 0) + 1);
        if (p.year !== null) {
            const row = byYearType.get(p.year) ?? new Map();
            row.set(p.docType, (row.get(p.docType) ?? 0) + 1);
            byYearType.set(p.year, row);
        }
        for (const a of p.authors) {
            authors.set(a.key, (authors.get(a.key) ?? 0) + 1);
            authorNames.set(a.key, a.name);
            authorships++;
        }
        for (const k of p.keywords) keywords.set(k, (keywords.get(k) ?? 0) + 1);
        if (p.venue) venues.set(p.venue, (venues.get(p.venue) ?? 0) + 1);
    }

    const years = [...byYearType.keys()].sort((a, b) => a - b);
    // Années contiguës pour que les années sans publication apparaissent à 0.
    const fullYears = years.length ? Array.from({ length: years[years.length - 1] - years[0] + 1 }, (_, i) => years[0] + i) : [];

    return {
        total: pubs.length,
        authorCount: authors.size,
        avgAuthors: pubs.length ? authorships / pubs.length : 0,
        firstYear: years[0] ?? null,
        lastYear: years[years.length - 1] ?? null,
        years: fullYears,
        types: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
        byYearType,
        byType,
        topAuthors: topN(authors, limits.topAuthors ?? 10),
        authorNames,
        topKeywords: topN(keywords, limits.topKeywords ?? 15),
        topVenues: topN(venues, limits.topVenues ?? 10),
    };
}
