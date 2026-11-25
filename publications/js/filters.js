// @ts-check

import { docTypeLabel } from './config.js';
import { debounce, h, normText, personKey } from './util.js';

/**
 * @typedef {import('./hal.js').Publication} Publication
 * @typedef {import('./hal.js').Structure} Structure
 * @typedef {{ label: string, key: string, exact: boolean }} AuthorTerm
 * @typedef {{ label: string, norm: string, exact: boolean }} KeywordTerm
 * @typedef {'all'|'any'} MatchMode
 * @typedef {Object} FilterState
 * @property {string} text
 * @property {string} venue
 * @property {string[]} venues
 * @property {MatchMode} authorsMode
 * @property {MatchMode} keywordsMode
 * @property {MatchMode} venuesMode
 * @property {number|null} yearMin
 * @property {number|null} yearMax
 * @property {Set<string>} types
 * @property {Set<number>} structs
 * @property {AuthorTerm[]} authors
 * @property {KeywordTerm[]} keywords
 */

/** @returns {FilterState} */
export function emptyFilters() {
    return { text: '', venue: '', venues: [], authorsMode: 'all', keywordsMode: 'all', venuesMode: 'all',
        yearMin: null, yearMax: null, types: new Set(), structs: new Set(), authors: [], keywords: [] };
}

/**
 * @template T
 * @param {T[]} terms
 * @param {MatchMode} mode
 * @param {(term: T) => boolean} predicate
 */
function matchesTerms(terms, mode, predicate) {
    return !terms.length || (mode === 'any' ? terms.some(predicate) : terms.every(predicate));
}

/**
 * @param {Publication} pub
 * @param {FilterState} f
 */
export function matches(pub, f) {
    if (f.yearMin !== null && (pub.year === null || pub.year < f.yearMin)) return false;
    if (f.yearMax !== null && (pub.year === null || pub.year > f.yearMax)) return false;
    if (f.types.size && !f.types.has(pub.docType)) return false;
    if (f.structs.size && !pub.structs.some(s => f.structs.has(s))) return false;

    if (f.text) {
        const tokens = normText(f.text).split(' ').filter(Boolean);
        if (!tokens.every(t => pub.searchText.includes(t))) return false;
    }
    const venues = f.venue ? [...f.venues, f.venue] : f.venues;
    if (!matchesTerms(venues, f.venuesMode, venue =>
        !!pub.venue && normText(pub.venue).includes(normText(venue)))) return false;
    if (!matchesTerms(f.authors, f.authorsMode, term => {
        const tokens = term.key.split(' ');
        return pub.authors.some(a => term.exact
            ? a.key === term.key
            : [a.key, ...a.aliases.map(personKey)].some(key => tokens.every(t => key.includes(t))));
    })) return false;
    if (!matchesTerms(f.keywords, f.keywordsMode, term =>
        pub.keywords.some(k => {
            const n = normText(k);
            return term.exact ? n === term.norm : n.includes(term.norm);
        }))) return false;
    return true;
}

/** @param {FilterState} f */
export function isActive(f) {
    return !!(f.text || f.venue || f.venues.length || f.yearMin !== null || f.yearMax !== null || f.types.size
        || f.structs.size || f.authors.length || f.keywords.length);
}

/**
 * Panneau de filtres : lie le HTML statique de index.html à un FilterState.
 */
export class FilterPanel {
    /**
     * @param {() => void} onChange
     */
    constructor(onChange) {
        this.onChange = onChange;
        this.state = emptyFilters();
        /** @type {Map<string, string>} clé auteur -> nom affiché */
        this.knownAuthors = new Map();
        /** @type {Map<string, string>} nom ou alias normalisé -> clé auteur */
        this.knownAuthorKeys = new Map();
        /** @type {Map<string, string>} mot-clé normalisé -> affiché */
        this.knownKeywords = new Map();
        /** @type {Publication[]} */
        this.pubs = [];
        /** @type {Structure[]} */
        this.structures = [];

        /** @param {string} id */
        const $ = id => /** @type {HTMLInputElement} */ (document.getElementById(id));
        this.el = {
            text: $('f-text'), author: $('f-author'), keyword: $('f-keyword'), venue: $('f-venue'),
            yearMin: $('f-year-min'), yearMax: $('f-year-max'),
            types: $('f-types'), structs: $('f-structs'), structsGroup: $('f-structs-group'),
            chipsAuthors: $('chips-authors'), chipsKeywords: $('chips-keywords'), chipsVenues: $('chips-venues'),
            modeAuthors: $('mode-authors'), modeKeywords: $('mode-keywords'), modeVenues: $('mode-venues'),
            authorsAll: $('authors-all'), authorsAny: $('authors-any'),
            keywordsAll: $('keywords-all'), keywordsAny: $('keywords-any'),
            venuesAll: $('venues-all'), venuesAny: $('venues-any'),
            dlAuthors: $('dl-authors'), dlKeywords: $('dl-keywords'), dlVenues: $('dl-venues'),
            reset: $('f-reset'),
        };

        const changed = () => { this.#readInputs(); this.onChange(); };
        const changedSoon = debounce(changed, 200);
        this.el.text.addEventListener('input', changedSoon);
        this.el.venue.addEventListener('input', changedSoon);
        this.el.yearMin.addEventListener('change', changed);
        this.el.yearMax.addEventListener('change', changed);
        this.el.reset.addEventListener('click', () => this.reset());

        for (const [input, add] of /** @type {const} */ ([
            [this.el.author, (/** @type {string} */ v) => this.addAuthor(v)],
            [this.el.keyword, (/** @type {string} */ v) => this.addKeyword(v)],
            [this.el.venue, (/** @type {string} */ v) => this.addVenue(v)],
        ])) {
            const commit = () => { if (input.value.trim()) { const value = input.value; input.value = ''; add(value); } };
            input.addEventListener('change', commit);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
            });
        }
        for (const [input, key, mode] of /** @type {const} */ ([
            [this.el.authorsAll, 'authorsMode', 'all'], [this.el.authorsAny, 'authorsMode', 'any'],
            [this.el.keywordsAll, 'keywordsMode', 'all'], [this.el.keywordsAny, 'keywordsMode', 'any'],
            [this.el.venuesAll, 'venuesMode', 'all'], [this.el.venuesAny, 'venuesMode', 'any'],
        ])) {
            input.addEventListener('change', () => { if (input.checked) { this.state[key] = mode; this.onChange(); } });
        }
    }

    #readInputs() {
        const s = this.state;
        s.text = this.el.text.value.trim();
        s.venue = this.el.venue.value.trim();
        s.yearMin = this.el.yearMin.value ? Number(this.el.yearMin.value) : null;
        s.yearMax = this.el.yearMax.value ? Number(this.el.yearMax.value) : null;
        if (s.yearMin !== null && s.yearMax !== null && s.yearMin > s.yearMax) {
            [s.yearMin, s.yearMax] = [s.yearMax, s.yearMin];
        }
    }

    /**
     * Charge un nouveau jeu de données : remplit suggestions, années, types, structures.
     * @param {Publication[]} pubs
     * @param {Structure[]} structures
     */
    setData(pubs, structures) {
        this.pubs = pubs;
        this.structures = structures;
        this.state = emptyFilters();

        this.knownAuthors.clear();
        this.knownAuthorKeys.clear();
        this.knownKeywords.clear();
        const venues = new Set();
        const years = new Set();
        /** @type {Map<string, number>} */
        const typeCounts = new Map();
        for (const p of pubs) {
            for (const a of p.authors) {
                this.knownAuthors.set(a.key, a.name);
                for (const name of [a.name, ...a.aliases]) this.knownAuthorKeys.set(personKey(name), a.key);
            }
            for (const k of p.keywords) this.knownKeywords.set(normText(k), k);
            if (p.venue) venues.add(p.venue);
            if (p.year !== null) years.add(p.year);
            typeCounts.set(p.docType, (typeCounts.get(p.docType) ?? 0) + 1);
        }

        /** @param {HTMLElement} dl @param {Iterable<string>} values */
        const fillList = (dl, values) => dl.replaceChildren(...[...values].sort((a, b) => a.localeCompare(b)).map(v => h('option', { value: v })));
        fillList(this.el.dlAuthors, this.knownAuthors.values());
        fillList(this.el.dlKeywords, this.knownKeywords.values());
        fillList(this.el.dlVenues, venues);

        const sortedYears = [...years].sort((a, b) => b - a);
        for (const select of [this.el.yearMin, this.el.yearMax]) {
            select.replaceChildren(h('option', { value: '', text: select === this.el.yearMin ? 'Depuis…' : "Jusqu'à…" }),
                ...sortedYears.map(y => h('option', { value: y, text: String(y) })));
        }

        this.el.types.replaceChildren(...[...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([code, n]) =>
            this.#toggleButton(`${docTypeLabel(code)} (${n})`, () => this.#toggle(this.state.types, code), undefined, code)));

        this.el.structsGroup.hidden = structures.length < 2;
        this.el.structs.replaceChildren(...structures.map(s =>
            this.#toggleButton(s.acronym, () => this.#toggle(this.state.structs, s.id), s.label)));

        this.#syncUi();
    }

    /**
     * @param {string} label
     * @param {() => boolean} onToggle
     * @param {string} [title]
     * @param {string} [code]
     */
    #toggleButton(label, onToggle, title, code) {
        const btn = h('button', { type: 'button', class: 'btn btn-sm btn-toggle', title, 'data-code': code, 'aria-pressed': 'false', text: label });
        btn.addEventListener('click', () => {
            const on = onToggle();
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', String(on));
            this.onChange();
        });
        return btn;
    }

    /**
     * @template T
     * @param {Set<T>} set
     * @param {T} value
     */
    #toggle(set, value) {
        if (set.has(value)) set.delete(value); else set.add(value);
        return set.has(value);
    }

    /** Reflète le state dans les contrôles (après une action programmatique). */
    #syncUi() {
        const s = this.state;
        this.el.text.value = s.text;
        this.el.venue.value = s.venue;
        this.el.modeAuthors.hidden = !s.authors.length;
        this.el.modeKeywords.hidden = !s.keywords.length;
        this.el.modeVenues.hidden = !s.venues.length;
        this.el.authorsAll.checked = s.authorsMode === 'all';
        this.el.authorsAny.checked = s.authorsMode === 'any';
        this.el.keywordsAll.checked = s.keywordsMode === 'all';
        this.el.keywordsAny.checked = s.keywordsMode === 'any';
        this.el.venuesAll.checked = s.venuesMode === 'all';
        this.el.venuesAny.checked = s.venuesMode === 'any';
        this.el.yearMin.value = s.yearMin?.toString() ?? '';
        this.el.yearMax.value = s.yearMax?.toString() ?? '';

        const syncButtons = (/** @type {HTMLElement} */ container, /** @type {boolean[]} */ states) => {
            [...container.children].forEach((btn, i) => {
                btn.classList.toggle('active', states[i]);
                btn.setAttribute('aria-pressed', String(states[i]));
            });
        };
        syncButtons(this.el.types, [...this.el.types.children].map(b => this.state.types.has(/** @type {HTMLElement} */ (b).dataset.code ?? '')));
        syncButtons(this.el.structs, this.structures.map(st => s.structs.has(st.id)));

        this.#renderChips(this.el.chipsAuthors, s.authors, t => { s.authors = s.authors.filter(x => x !== t); });
        this.#renderChips(this.el.chipsKeywords, s.keywords, t => { s.keywords = s.keywords.filter(x => x !== t); });
        this.#renderChips(this.el.chipsVenues, s.venues.map(label => ({ label })), t => { s.venues = s.venues.filter(x => x !== t.label); });
    }

    /**
     * @param {HTMLElement} container
     * @param {{ label: string }[]} terms
     * @param {(term: any) => void} remove
     */
    #renderChips(container, terms, remove) {
        container.replaceChildren(...terms.map(t => h('span', { class: 'badge base-badge filter-chip' },
            t.label,
            h('button', {
                type: 'button', 'aria-label': `Retirer ${t.label}`, class: 'chip-remove', text: '×',
                onclick: () => { remove(t); this.#syncUi(); this.onChange(); },
            }))));
    }

    /** @param {string} input */
    addAuthor(input) {
        const inputKey = personKey(input);
        const knownKey = this.knownAuthorKeys.get(inputKey);
        const key = knownKey ?? inputKey;
        if (!key || this.state.authors.some(a => a.key === key)) return;
        const known = this.knownAuthors.get(key);
        this.state.authors.push({ label: known ?? input.trim(), key, exact: knownKey !== undefined });
        this.#syncUi();
        this.onChange();
    }

    /** @param {string} input */
    addKeyword(input) {
        const norm = normText(input);
        if (!norm || this.state.keywords.some(k => k.norm === norm)) return;
        const known = this.knownKeywords.get(norm);
        this.state.keywords.push({ label: known ?? input.trim(), norm, exact: known !== undefined });
        this.#syncUi();
        this.onChange();
    }

    /** @param {number|null} min @param {number|null} max */
    setYears(min, max) {
        this.state.yearMin = min;
        this.state.yearMax = max;
        this.#syncUi();
        this.onChange();
    }

    /** @param {string} code */
    toggleType(code) {
        this.#toggle(this.state.types, code);
        this.#syncUi();
        this.onChange();
    }

    /** @param {string} venue */
    addVenue(venue) {
        const label = venue.trim();
        const norm = normText(label);
        this.state.venue = '';
        if (norm && !this.state.venues.some(v => normText(v) === norm)) this.state.venues.push(label);
        this.#syncUi();
        this.onChange();
    }

    reset() {
        this.state = emptyFilters();
        this.#syncUi();
        this.onChange();
    }

    /** @param {Publication[]} pubs */
    apply(pubs) {
        return pubs.filter(p => matches(p, this.state));
    }
}
