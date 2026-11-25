// @ts-check

import { AUTHOR_ALIAS_GROUPS, HAL_API, HAL_FIELDS, HAL_PAGE_ROWS } from './config.js';
import { normText, personKey } from './util.js';

/**
 * @typedef {{ name: string, key: string, aliases: string[] }} Author
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
 * @property {number[]} affiliationIds   structures associées aux auteurs dans cette publication
 * @property {boolean} incompleteAffiliations  au moins un auteur sans affiliation exploitable
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
 * @param {string[]} authorForms
 * @param {string[]} links
 * @param {number} [authorCount]
 * @returns {{ affiliationIds: number[], incompleteAffiliations: boolean }}
 */
export function extractAffiliations(authorForms, links, authorCount = authorForms.length) {
    /** @type {Set<string>} */
    const authorIds = new Set();
    let incomplete = !authorForms.length || authorForms.length < authorCount;
    for (const form of authorForms) {
        const id = form.match(/_FacetSep_(.+)$/)?.[1];
        if (id) authorIds.add(id);
        else incomplete = true;
    }
    const linkedAuthors = new Set();
    const affiliationIds = new Set();
    for (const link of links) {
        const match = link.match(/^(.+?)_FacetSep_.*?_JoinSep_(\d+)_FacetSep_/);
        if (!match || Number(match[2]) === 0) { incomplete = true; continue; }
        linkedAuthors.add(match[1]);
        affiliationIds.add(Number(match[2]));
    }
    return {
        affiliationIds: [...affiliationIds],
        incompleteAffiliations: incomplete || [...authorIds].some(id => !linkedAuthors.has(id)),
    };
}

/**
 * @param {number[]} ids
 * @returns {Promise<Map<number, string>>}
 */
export async function fetchAffiliationCountries(ids) {
    /** @type {Map<number, string>} */
    const countries = new Map();
    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const params = new URLSearchParams({
            q: `docid:(${batch.join(' OR ')})`,
            fl: 'docid,country_s',
            rows: String(batch.length),
            wt: 'json',
        });
        const json = await getJson(`${HAL_API}/ref/structure/?${params}`);
        for (const doc of json.response.docs) {
            if (doc.country_s) countries.set(Number(doc.docid), String(doc.country_s).toUpperCase());
        }
    }
    return countries;
}

/**
 * Résout les formes abrégées via le référentiel HAL, dont le docid porte l'identifiant auteur.
 * @param {string[]} names
 * @param {(phase: 'search'|'aliases', loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<Map<string, number>>} personKey -> identifiant HAL non ambigu
 */
export async function fetchAuthorIdentityMap(names, onProgress) {
    const initials = [...new Map(names
        .filter(name => /(?:^|[\s.])[\p{L}]\./u.test(name))
        .map(name => [personKey(name), name])).values()];
    if (!initials.length) return new Map();

    const identities = new Map();
    const idsByName = new Map();
    const batches = [];
    for (let i = 0; i < initials.length; i += 50) batches.push(initials.slice(i, i + 50));

    onProgress?.('search', 0, batches.length);
    let completed = 0;
    const searchResults = await Promise.all(batches.map(async batch => {
        const terms = batch.flatMap(name => {
            const escaped = name.replace(/[\\"]/g, '\\$&');
            const surname = name.trim().split(/\s+/).at(-1).replace(/[\\"]/g, '\\$&');
            return [`fullName_s:"${escaped}"`, `lastName_s:"${surname}"`];
        });
        const params = new URLSearchParams({
            q: `(${terms.join(' OR ')})`,
            fl: 'docid,fullName_s,firstName_s,lastName_s',
            rows: '10000',
            wt: 'json',
        });
        const json = await getJson(`${HAL_API}/ref/author/?${params}`);
        onProgress?.('search', ++completed, batches.length);
        return { batch, docs: json.response.docs };
    }));
    for (const { batch, docs } of searchResults) {
        const requested = batch.map(name => {
            const parts = name.trim().split(/\s+/);
            return {
                key: personKey(name),
                initial: normText(parts[0]).replace(/[^a-z]/g, ''),
                surname: personKey(parts.at(-1)),
                exactIds: new Set(),
                initialIds: new Set(),
                prefixIds: new Set(),
            };
        });
        for (const doc of docs) {
            const match = String(doc.docid ?? '').match(/-(\d+)$/);
            const id = match ? Number(match[1]) : 0;
            if (!id) continue;
            for (const author of requested) {
                const firstName = normText(doc.firstName_s ?? '');
                if (personKey(doc.fullName_s ?? '') === author.key) author.exactIds.add(id);
                if (personKey(doc.lastName_s ?? '') !== author.surname || !firstName.startsWith(author.initial)) continue;
                author.prefixIds.add(id);
                if (firstName === author.initial) author.initialIds.add(id);
            }
        }
        for (const author of requested) {
            const ids = author.exactIds.size ? author.exactIds : author.initialIds.size ? author.initialIds : author.prefixIds;
            if (ids.size) idsByName.set(author.key, ids);
        }
    }

    const candidateIds = [...new Set([...idsByName.values()]
        .filter(ids => ids.size === 1)
        .map(ids => [...ids][0]))];
    if (!candidateIds.length) return new Map();

    const idBatches = [];
    for (let i = 0; i < candidateIds.length; i += 50) idBatches.push(candidateIds.slice(i, i + 50));
    onProgress?.('aliases', 0, idBatches.length);
    completed = 0;
    const aliasResults = await Promise.all(idBatches.map(async batch => {
        const terms = batch.map(id => `*-${id}`);
        const params = new URLSearchParams({
            q: `docid:(${terms.join(' OR ')})`,
            fl: 'docid,fullName_s',
            rows: '10000',
            wt: 'json',
        });
        const json = await getJson(`${HAL_API}/ref/author/?${params}`);
        onProgress?.('aliases', ++completed, idBatches.length);
        return json.response.docs;
    }));
    for (const docs of aliasResults) {
        for (const doc of docs) {
            const nameKey = personKey(doc.fullName_s ?? '');
            const match = String(doc.docid ?? '').match(/-(\d+)$/);
            const id = match ? Number(match[1]) : 0;
            if (!id) continue;
            const ids = identities.get(nameKey) ?? new Set();
            ids.add(id);
            identities.set(nameKey, ids);
        }
    }

    return new Map([...identities]
        .filter(([, ids]) => ids.size === 1)
        .map(([name, ids]) => [name, [...ids][0]]));
}

/**
 * Fusionne les documents venant de plusieurs structures et uniformise auteurs / mots-clés.
 * @param {{ structId: number, docs: any[] }[]} results
 * @param {Map<string, number>} [halAuthorIds] personKey -> identifiant HAL
 * @returns {Publication[]}
 */
export function buildPublications(results, halAuthorIds = new Map()) {
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
    /** @type {Map<string, Set<string>>} */
    const authorAliases = new Map();
    /** @type {Map<string, Map<string, number>>} */
    const keywordForms = new Map();
    const aliasKeys = new Map();
    const aliasNames = new Map();
    for (const group of AUTHOR_ALIAS_GROUPS) {
        aliasNames.set(group.key, group.name);
        for (const alias of group.aliases) aliasKeys.set(personKey(alias), group.key);
    }
    /** @param {string} name */
    const authorKey = name => {
        const normalized = personKey(name);
        return aliasKeys.get(normalized) ?? (halAuthorIds.has(normalized)
            ? `hal:${halAuthorIds.get(normalized)}`
            : normalized);
    };
    /** @param {Map<string, Map<string, number>>} store @param {string} key @param {string} form */
    const count = (store, key, form) => {
        const forms = store.get(key) ?? new Map();
        forms.set(form, (forms.get(form) ?? 0) + 1);
        store.set(key, forms);
    };
    /** @param {Map<string, number>} forms */
    const best = forms => [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];

    for (const { doc } of merged.values()) {
        for (const a of asArray(doc.authFullName_s)) {
            const key = authorKey(a);
            count(authorForms, key, a.trim());
            const aliases = authorAliases.get(key) ?? new Set();
            aliases.add(a.trim());
            authorAliases.set(key, aliases);
        }
        for (const k of asArray(doc.keyword_s)) count(keywordForms, normText(k), k.trim());
    }

    /** @type {Publication[]} */
    const publications = [];
    for (const [id, { doc, structs }] of merged) {
        const seenAuthors = new Set();
        /** @type {Author[]} */
        const authors = [];
        for (const raw of asArray(doc.authFullName_s)) {
            const key = authorKey(raw);
            if (!key || seenAuthors.has(key)) continue;
            seenAuthors.add(key);
            const forms = /** @type {Map<string, number>} */ (authorForms.get(key));
            const name = aliasNames.get(key) ?? (key.startsWith('hal:')
                ? [...forms.entries()].sort((a, b) => {
                    const abbreviated = value => /(?:^|[\s.])[\p{L}]\./u.test(value);
                    return Number(abbreviated(a[0])) - Number(abbreviated(b[0]))
                        || b[1] - a[1]
                        || b[0].length - a[0].length;
                })[0][0]
                : best(forms));
            authors.push({ key, name, aliases: [...(authorAliases.get(key) ?? [])] });
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
            ...extractAffiliations(asArray(doc.authFullNameIdFormPerson_fs), asArray(doc.authIdHasStructure_fs), asArray(doc.authFullName_s).length),
            searchText: normText(`${title} ${abstract}`),
        });
    }

    publications.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
    return publications;
}

/**
 * @param {number[]} structIds
 * @param {(progress: { phase: 'publications'|'author-search'|'author-aliases', loaded: number, total: number }) => void} [onProgress]
 */
export async function loadAll(structIds, onProgress) {
    /** @type {Map<number, [number, number]>} */
    const progress = new Map();
    const report = () => {
        let loaded = 0, total = 0;
        for (const [l, t] of progress.values()) { loaded += l; total += t; }
        onProgress?.({ phase: 'publications', loaded, total });
    };

    const [structures, results] = await Promise.all([
        fetchStructures(structIds),
        Promise.all(structIds.map(async structId => {
            const docs = await fetchStructDocs(structId, (l, t) => { progress.set(structId, [l, t]); report(); });
            return { structId, docs };
        })),
    ]);
    const authorNames = [...new Set(results.flatMap(({ docs }) =>
        docs.flatMap(doc => asArray(doc.authFullName_s))))];
    let authorIds = new Map();
    try {
        onProgress?.({ phase: 'author-search', loaded: 0, total: 0 });
        authorIds = await fetchAuthorIdentityMap(authorNames, (phase, loaded, total) => {
            onProgress?.({
                phase: phase === 'search' ? 'author-search' : 'author-aliases',
                loaded,
                total,
            });
        });
    } catch (err) {
        console.warn('Impossible de résoudre les identifiants auteurs HAL ; les noms restent affichés séparément.', err);
    }
    return { structures, publications: buildPublications(results, authorIds) };
}
