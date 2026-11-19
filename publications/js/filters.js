// @ts-check

import { docTypeLabel } from './config.js';
import { debounce, h, normText, personKey } from './util.js';

/**
 * @typedef {import('./hal.js').Publication} Publication
 * @typedef {import('./hal.js').Structure} Structure
 * @typedef {{ label: string, key: string, exact: boolean }} AuthorTerm
 * @typedef {{ label: string, norm: string, exact: boolean }} KeywordTerm
 * @typedef {Object} FilterState
 * @property {string} text
 * @property {string} venue
 * @property {number|null} yearMin
 * @property {number|null} yearMax
 * @property {Set<string>} types
 * @property {Set<number>} structs
 * @property {AuthorTerm[]} authors
 * @property {KeywordTerm[]} keywords
 */

/** @returns {FilterState} */
export function emptyFilters() {
    return { text: '', venue: '', yearMin: null, yearMax: null, types: new Set(), structs: new Set(), authors: [], keywords: [] };
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
    if (f.venue) {
        if (!pub.venue || !normText(pub.venue).includes(normText(f.venue))) return false;
    }
    for (const term of f.authors) {
        const tokens = term.key.split(' ');
        const ok = pub.authors.some(a => term.exact ? a.key === term.key : tokens.every(t => a.key.includes(t)));
        if (!ok) return false;
    }
    for (const term of f.keywords) {
        const ok = pub.keywords.some(k => {
            const n = normText(k);
            return term.exact ? n === term.norm : n.includes(term.norm);
        });
        if (!ok) return false;
    }
    return true;
}

/** @param {FilterState} f */
export function isActive(f) {
    return !!(f.text || f.venue || f.yearMin !== null || f.yearMax !== null || f.types.size
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
            chipsAuthors: $('chips-authors'), chipsKeywords: $('chips-keywords'),
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

        // Auteur / mot-clé : validés par Entrée ou par le choix d'une suggestion.
        for (const [input, add] of /** @type {const} */ ([[this.el.author, (/** @type {string} */ v) => this.addAuthor(v)], [this.el.keyword, (/** @type {string} */ v) => this.addKeyword(v)]])) {
            input.addEventListener('change', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); if (input.value.trim()) { add(input.value); input.value = ''; } }
            });
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
        this.knownKeywords.clear();
        const venues = new Set();
        const years = new Set();
        /** @type {Map<string, number>} */
        const typeCounts = new Map();
        for (const p of pubs) {
            for (const a of p.authors) this.knownAuthors.set(a.key, a.name);
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
        const key = personKey(input);
        if (!key || this.state.authors.some(a => a.key === key)) return;
        const known = this.knownAuthors.get(key);
        this.state.authors.push({ label: known ?? input.trim(), key, exact: known !== undefined });
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
    setVenue(venue) {
        this.state.venue = venue;
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
