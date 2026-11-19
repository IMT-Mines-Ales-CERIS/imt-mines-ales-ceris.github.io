// @ts-check

import { HAL_API, HAL_FIELDS, HAL_PAGE_ROWS } from './config.js';
import { normText, personKey } from './util.js';

/**
 * @typedef {{ name: string, key: string }} Author
 * @typedef {Object} Publication
 * @property {string} id
 * @property {string} uri
 * @property {string} title
 * @property {Author[]} authors
 * @property {string[]} keywords
 * @property {string} abstract
 * @property {number|null} year
 * @property {string|null} venue          conférence ou revue
 * @property {'conference'|'journal'|null} venueKind
 * @property {string} docType
 * @property {number[]} structs           structures HAL (parmi celles demandées) contenant ce document
 * @property {string} searchText          titre + résumé normalisés, pour la recherche
 *
 * @typedef {{ id: number, label: string, acronym: string }} Structure
 */

/**
 * Accepte "1451414, 1100796" ou "1451414 1100796" et renvoie des identifiants uniques.
 * @param {string} str
 * @returns {number[]}
 */
export function parseStructIds(str) {
    const ids = (str.match(/\d+/g) ?? []).map(Number).filter(n => n > 0);
    return [...new Set(ids)];
}

/** @param {string} url */
async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HAL a répondu ${res.status} pour ${url}`);
    return res.json();
}

/**
 * Noms et acronymes des structures, pour l'affichage.
 * @param {number[]} ids
 * @returns {Promise<Structure[]>}
 */
export async function fetchStructures(ids) {
    /** @type {Structure[]} */
    const fallback = ids.map(id => ({ id, label: `Structure ${id}`, acronym: String(id) }));
    try {
        const q = encodeURIComponent(`docid:(${ids.join(' OR ')})`);
        const json = await getJson(`${HAL_API}/ref/structure/?q=${q}&fl=docid,name_s,acronym_s&rows=${ids.length}&wt=json`);
        const found = new Map(json.response.docs.map((/** @type {any} */ d) => [Number(d.docid), d]));
        return ids.map((id, i) => {
            const d = /** @type {any} */ (found.get(id));
            if (!d) return fallback[i];
            const acronym = d.acronym_s ? String(d.acronym_s).split(' - ')[0] : String(id);
            return { id, label: d.name_s ?? acronym, acronym };
        });
    } catch (err) {
        console.warn(err);
        return fallback;
    }
}

/**
 * Récupère toutes les publications d'une structure (pagination par `start`).
 * @param {number} structId
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<any[]>}
 */
export async function fetchStructDocs(structId, onProgress) {
    /** @type {any[]} */
    const docs = [];
    let total = Infinity;
    while (docs.length < total) {
        const params = new URLSearchParams({
            q: `structId_i:${structId}`,
            fl: HAL_FIELDS,
            sort: 'docid asc',
            rows: String(HAL_PAGE_ROWS),
            start: String(docs.length),
            wt: 'json',
        });
        const json = await getJson(`${HAL_API}/search/?${params}`);
        total = json.response.numFound;
        const page = json.response.docs;
        if (!page.length) break;
        docs.push(...page);
        onProgress?.(docs.length, total);
    }
    return docs;
}

/** @param {any} v @returns {string[]} */
const asArray = v => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]).map(String);

/**
 * Fusionne les documents venant de plusieurs structures et uniformise auteurs / mots-clés.
 * @param {{ structId: number, docs: any[] }[]} results
 * @returns {Publication[]}
 */
export function buildPublications(results) {
    /** @type {Map<string, { doc: any, structs: Set<number> }>} */
    const merged = new Map();
    for (const { structId, docs } of results) {
        for (const doc of docs) {
            const id = doc.halId_s ?? doc.uri_s;
            if (!id) continue;
            const entry = merged.get(id) ?? { doc, structs: new Set() };
            entry.structs.add(structId);
            merged.set(id, entry);
        }
    }

    // Forme d'affichage la plus fréquente pour chaque auteur / mot-clé (variantes de casse, ordre, accents).
    /** @type {Map<string, Map<string, number>>} */
    const authorForms = new Map();
    /** @type {Map<string, Map<string, number>>} */
    const keywordForms = new Map();
    /** @param {Map<string, Map<string, number>>} store @param {string} key @param {string} form */
    const count = (store, key, form) => {
        const forms = store.get(key) ?? new Map();
        forms.set(form, (forms.get(form) ?? 0) + 1);
        store.set(key, forms);
    };
    /** @param {Map<string, number>} forms */
    const best = forms => [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];

    for (const { doc } of merged.values()) {
        for (const a of asArray(doc.authFullName_s)) count(authorForms, personKey(a), a.trim());
        for (const k of asArray(doc.keyword_s)) count(keywordForms, normText(k), k.trim());
    }

    /** @type {Publication[]} */
    const publications = [];
    for (const [id, { doc, structs }] of merged) {
        const seenAuthors = new Set();
        /** @type {Author[]} */
        const authors = [];
        for (const raw of asArray(doc.authFullName_s)) {
            const key = personKey(raw);
            if (!key || seenAuthors.has(key)) continue;
            seenAuthors.add(key);
            authors.push({ key, name: best(/** @type {Map<string, number>} */ (authorForms.get(key))) });
        }

        const seenKeywords = new Set();
        /** @type {string[]} */
        const keywords = [];
        for (const raw of asArray(doc.keyword_s)) {
            const key = normText(raw);
            if (!key || seenKeywords.has(key)) continue;
            seenKeywords.add(key);
            keywords.push(best(/** @type {Map<string, number>} */ (keywordForms.get(key))));
        }

        const title = asArray(doc.title_s)[0] ?? '(Sans titre)';
        const abstract = asArray(doc.abstract_s)[0] ?? '';
        const conference = doc.conferenceTitle_s ? String(doc.conferenceTitle_s) : null;
        const journal = doc.journalTitle_s ? String(doc.journalTitle_s) : null;

        publications.push({
            id,
            uri: doc.uri_s ?? `https://hal.science/${id}`,
            title,
            authors,
            keywords,
            abstract,
            year: typeof doc.producedDateY_i === 'number' ? doc.producedDateY_i : null,
            venue: conference ?? journal,
            venueKind: conference ? 'conference' : journal ? 'journal' : null,
            docType: doc.docType_s ?? 'UNDEFINED',
            structs: [...structs],
            searchText: normText(`${title} ${abstract}`),
        });
    }

    publications.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
    return publications;
}

/**
 * @param {number[]} structIds
 * @param {(loaded: number, total: number) => void} [onProgress] agrégé sur toutes les structures
 */
export async function loadAll(structIds, onProgress) {
    /** @type {Map<number, [number, number]>} */
    const progress = new Map();
    const report = () => {
        let loaded = 0, total = 0;
        for (const [l, t] of progress.values()) { loaded += l; total += t; }
        onProgress?.(loaded, total);
    };

    const [structures, results] = await Promise.all([
        fetchStructures(structIds),
        Promise.all(structIds.map(async structId => {
            const docs = await fetchStructDocs(structId, (l, t) => { progress.set(structId, [l, t]); report(); });
            return { structId, docs };
        })),
    ]);
    return { structures, publications: buildPublications(results) };
}
