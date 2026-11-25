// @ts-check

import { DEFAULT_STRUCT_IDS, PAGE_SIZE, docTypeLabel } from './config.js';
import { FilterPanel, isActive } from './filters.js';
import { AUTHOR_LABELS, KEYWORD_LABELS, buildGraph, buildKeywordGraph, renderGraph } from './graph.js';
import { loadAll, parseStructIds } from './hal.js';
import { renderCharts } from './charts.js';
import { computeStats } from './stats.js';
import { countCountries, loadCountryData, renderCountries } from './countries.js';
import { debounce, h } from './util.js';

/** @typedef {import('./hal.js').Publication} Publication */
/** @typedef {import('./hal.js').Structure} Structure */

/** @param {string} id */
const $ = id => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} id */
const $input = id => /** @type {HTMLInputElement} */ (document.getElementById(id));

const app = {
    /** @type {number[]} */
    structIds: [],
    /** @type {Structure[]} */
    structures: [],
    /** @type {Publication[]} */
    all: [],
    /** @type {Publication[]} */
    filtered: [],
    page: 0,
    loadToken: 0,
    /** @type {Set<string>} vues à recalculer lors de leur prochain affichage */
    dirty: new Set(['stats', 'graph', 'kwgraph', 'countries']),
};

/** @type {ReturnType<typeof loadCountryData>|null} */
let countryData = null;
let countryRenderToken = 0;

/* ---------- Structures (identifiants HAL) ---------- */

function readStructIdsFromUrl() {
    const param = new URLSearchParams(location.search).get('structId');
    const ids = param ? parseStructIds(param) : [];
    return ids.length ? ids : [...DEFAULT_STRUCT_IDS];
}

/** @param {number[]} ids */
function setStructIds(ids) {
    app.structIds = ids;
    const url = new URL(location.href);
    if (ids.join(',') === DEFAULT_STRUCT_IDS.join(',')) url.searchParams.delete('structId');
    else url.searchParams.set('structId', ids.join(','));
    history.replaceState(null, '', url);
    load();
}

function renderStructChips() {
    $('struct-chips').replaceChildren(...app.structIds.map(id => {
        const s = app.structures.find(x => x.id === id);
        return h('span', { class: 'struct-chip', title: s?.label },
            s ? s.acronym : String(id),
            h('small', { text: String(id) }),
            app.structIds.length > 1 ? h('button', {
                type: 'button', class: 'chip-remove', 'aria-label': `Retirer la structure ${id}`, text: '×',
                onclick: () => setStructIds(app.structIds.filter(x => x !== id)),
            }) : null);
    }));
}

$('struct-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $input('struct-input');
    const ids = parseStructIds(input.value);
    input.value = '';
    if (ids.length) setStructIds([...new Set([...app.structIds, ...ids])]);
});

/* ---------- Statut ---------- */

/** @param {string|null} message @param {'info'|'danger'} [kind] */
function setStatus(message, kind = 'info') {
    const el = $('status');
    el.hidden = message === null;
    el.className = `alert alert-${kind}`;
    el.textContent = message ?? '';
}

/* ---------- Chargement ---------- */

async function load() {
    const token = ++app.loadToken;
    countryRenderToken++;
    renderStructChips();
    setStatus('Chargement des publications depuis HAL…');
    try {
        const { structures, publications } = await loadAll(app.structIds, progress => {
            if (token !== app.loadToken) return;
            if (progress.phase === 'publications') {
                setStatus(`Chargement des publications depuis HAL… ${progress.loaded} / ${progress.total}`);
            } else if (progress.phase === 'author-search') {
                const detail = progress.total ? ` ${progress.loaded} / ${progress.total}` : '';
                setStatus(`Identification des auteurs dans HAL…${detail}`);
            } else {
                setStatus(`Récupération des variantes de noms dans HAL… ${progress.loaded} / ${progress.total}`);
            }
        });
        if (token !== app.loadToken) return;
        app.structures = structures;
        app.all = publications;
        countryData = null;
        countryRenderToken++;
        renderStructChips();
        filters.setData(publications, structures);
        setStatus(publications.length ? null : 'Aucune publication trouvée pour ces structures.', 'info');
        refresh();
    } catch (err) {
        if (token !== app.loadToken) return;
        console.error(err);
        setStatus(`Impossible de charger les données HAL : ${err instanceof Error ? err.message : err}`, 'danger');
    }
}

/* ---------- Filtres ---------- */

const filters = new FilterPanel(() => refresh());

function refresh() {
    app.filtered = filters.apply(app.all);
    app.page = 0;
    app.dirty.add('stats').add('graph').add('kwgraph').add('countries');
    renderKpis();
    renderList();
    renderActiveView();
}

/* ---------- Indicateurs ---------- */

function renderKpis() {
    const stats = computeStats(app.filtered);
    const span = stats.firstYear === null ? '–' : stats.firstYear === stats.lastYear ? String(stats.firstYear) : `${stats.firstYear}–${stats.lastYear}`;
    /** @type {[string, string][]} */
    const items = [
        [String(stats.total), isActive(filters.state) ? `publications (sur ${app.all.length})` : 'publications'],
        [String(stats.authorCount), 'auteurs distincts'],
        [stats.avgAuthors.toFixed(1), 'auteurs par publication'],
        [span, 'période'],
    ];
    $('kpis').replaceChildren(...items.map(([value, label]) =>
        h('div', { class: 'col-6 col-md-3' }, h('div', { class: 'kpi base-radius-16 base-shadow' },
            h('div', { class: 'value', text: value }), h('div', { class: 'label', text: label })))));
    $('count-badge').textContent = String(stats.total);
}

/* ---------- Liste ---------- */

/** @param {Publication[]} pubs @param {string} mode */
function sorted(pubs, mode) {
    const copy = [...pubs];
    if (mode === 'year-asc') copy.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title));
    else if (mode === 'title') copy.sort((a, b) => a.title.localeCompare(b.title));
    else copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
    return copy;
}

/** @param {string} uri */
const safeUrl = uri => /^https?:\/\//i.test(uri) ? uri : '#';

/** @param {Publication} p */
function publicationCard(p) {
    const authors = h('p', { class: 'pub-authors text-muted mb-2' });
    p.authors.forEach((a, i) => {
        if (i) authors.append(', ');
        authors.append(h('button', { type: 'button', title: 'Filtrer sur cet auteur', text: a.name, onclick: () => filters.addAuthor(a.name) }));
    });

    const keywords = p.keywords.length
        ? h('div', { class: 'pub-keywords d-flex gap-1 flex-wrap mb-2' }, ...p.keywords.map(k =>
            h('button', { type: 'button', title: 'Filtrer sur ce mot-clé', onclick: () => filters.addKeyword(k) }, h('span', { class: 'badge base-badge', text: k }))))
        : null;

    const venue = [p.venue, p.year ?? null].filter(Boolean).join(', ');
    return h('article', { class: 'publication-item base-radius-16 base-shadow' },
        h('div', { class: 'd-flex justify-content-between align-items-start gap-3' },
            h('div', { class: 'flex-grow-1' },
                h('div', { class: 'small text-muted mb-1', text: docTypeLabel(p.docType) }),
                h('h3', { class: 'mb-2' }, h('a', { href: safeUrl(p.uri), target: '_blank', rel: 'noopener noreferrer', text: p.title })),
                authors,
                keywords,
                venue ? h('p', { class: 'pub-venue text-muted mb-0', text: venue }) : null,
                p.abstract ? h('details', { class: 'pub-abstract mt-2' }, h('summary', { text: 'Résumé' }), h('p', { text: p.abstract })) : null),
            h('a', { href: safeUrl(p.uri), target: '_blank', rel: 'noopener noreferrer', class: 'btn btn-outline-secondary btn-sm', 'aria-label': 'Ouvrir dans HAL', text: 'HAL ↗' })));
}

function renderList() {
    const mode = /** @type {HTMLSelectElement} */ ($('sort')).value;
    const items = sorted(app.filtered, mode);
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    app.page = Math.min(app.page, pages - 1);
    const slice = items.slice(app.page * PAGE_SIZE, (app.page + 1) * PAGE_SIZE);

    $('list-summary').textContent = items.length
        ? `${app.page * PAGE_SIZE + 1}–${app.page * PAGE_SIZE + slice.length} sur ${items.length}`
        : 'Aucune publication ne correspond aux filtres.';
    $('list').replaceChildren(...slice.map(publicationCard));

    const go = (/** @type {number} */ delta) => () => { app.page += delta; renderList(); $('view-tabs').scrollIntoView({ behavior: 'smooth' }); };
    $('pager').replaceChildren(...(pages > 1 ? [
        h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', text: '← Précédent', disabled: app.page === 0, onclick: go(-1) }),
        h('span', { class: 'small text-muted', text: `Page ${app.page + 1} / ${pages}` }),
        h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', text: 'Suivant →', disabled: app.page >= pages - 1, onclick: go(1) }),
    ] : []));
}

$('sort').addEventListener('change', () => { app.page = 0; renderList(); });

/* ---------- Statistiques & réseau (rendus à l'affichage de l'onglet) ---------- */

function activeView() {
    return /** @type {HTMLElement} */ (document.querySelector('#view-tabs .nav-link.active')).dataset.view;
}

function renderActiveView() {
    const view = activeView();
    if (!view || !app.dirty.has(view)) return;
    if (view === 'stats') renderStatsView();
    else if (view === 'graph') renderGraphView();
    else if (view === 'kwgraph') renderKeywordGraphView();
    else if (view === 'countries') renderCountriesView();
    app.dirty.delete(view);
}

async function renderCountriesView() {
    const token = ++countryRenderToken;
    $('countries-status').textContent = 'Chargement des affiliations et de la carte…';
    $('countries-map').replaceChildren();
    $('countries-legend').replaceChildren();
    $('countries-list').replaceChildren();
    const data = countryData ?? (countryData = loadCountryData(app.all));
    try {
        const { countries, topology, isoCodes } = await data;
        if (token !== countryRenderToken) return;
        const { counts, incomplete } = countCountries(app.filtered, countries);
        $('countries-status').textContent = `${incomplete} publication(s) sur ${app.filtered.length} présentent au moins une affiliation ou un pays manquant ; les résultats peuvent être incomplets.`;
        renderCountries($('countries-map'), $('countries-legend'), $('countries-list'), counts, topology, isoCodes);
    } catch (err) {
        if (token !== countryRenderToken) return;
        console.error('Impossible de charger la carte des pays partenaires.', err);
        if (countryData === data) countryData = null;
        $('countries-status').replaceChildren(
            h('span', { class: 'text-danger', text: `Impossible de charger la carte : ${err instanceof Error ? err.message : err} ` }),
            h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', text: 'Réessayer', onclick: () => { app.dirty.add('countries'); renderActiveView(); } }));
    }
}

function renderStatsView() {
    const stats = computeStats(app.filtered);
    $('stats-empty').hidden = stats.total > 0;
    $('stats-body').hidden = stats.total === 0;
    if (!stats.total) return;
    renderCharts(stats, {
        onYear: y => {
            const { yearMin, yearMax } = filters.state;
            if (yearMin === y && yearMax === y) filters.setYears(null, null); else filters.setYears(y, y);
        },
        onType: t => filters.toggleType(t),
        onAuthor: key => filters.addAuthor(stats.authorNames.get(key) ?? key),
        onKeyword: k => filters.addKeyword(k),
        onVenue: v => filters.addVenue(v),
    });
}

function renderGraphView() {
    /** @param {string} id @param {number} fallback */
    const num = (id, fallback) => Math.max(1, Math.floor(Number($input(id).value)) || fallback);
    const graph = buildGraph(app.filtered, {
        minPubs: num('g-min-pubs', 2),
        maxNodes: num('g-max-nodes', 80),
        minWeight: num('g-min-weight', 1),
        maxItemsPerPub: num('g-max-authors', 30),
    });
    $('graph-summary').textContent = graph.nodes.length
        ? `${graph.nodes.length} auteurs, ${graph.edges.length} liens. Taille = nombre de publications, épaisseur = co-publications, couleur = groupe de collaboration.`
        : "Aucun lien à afficher avec ces réglages : essayez d'abaisser les seuils.";
    renderGraph($('graph'), graph, key => {
        const node = graph.nodes.find(n => n.id === key);
        if (node) filters.addAuthor(node.name);
    }, $('graph-info'), AUTHOR_LABELS);
}

function renderKeywordGraphView() {
    /** @param {string} id @param {number} fallback */
    const num = (id, fallback) => Math.max(1, Math.floor(Number($input(id).value)) || fallback);
    const graph = buildKeywordGraph(app.filtered, {
        minPubs: num('k-min-pubs', 2),
        maxNodes: num('k-max-nodes', 80),
        minWeight: num('k-min-weight', 1),
        maxItemsPerPub: num('k-max-keywords', 15),
    });
    $('kwgraph-summary').textContent = graph.nodes.length
        ? `${graph.nodes.length} mots-clés, ${graph.edges.length} liens. Taille = nombre de publications, épaisseur = publications partagées, couleur = thématique.`
        : "Aucun lien à afficher avec ces réglages : essayez d'abaisser les seuils.";
    renderGraph($('kwgraph'), graph, key => {
        const node = graph.nodes.find(n => n.id === key);
        if (node) filters.addKeyword(node.name);
    }, $('kwgraph-info'), KEYWORD_LABELS);
}

for (const id of ['g-min-pubs', 'g-max-nodes', 'g-min-weight', 'g-max-authors']) {
    $input(id).addEventListener('input', debounce(() => { app.dirty.add('graph'); renderActiveView(); }, 300));
}
for (const id of ['k-min-pubs', 'k-max-nodes', 'k-min-weight', 'k-max-keywords']) {
    $input(id).addEventListener('input', debounce(() => { app.dirty.add('kwgraph'); renderActiveView(); }, 300));
}

document.querySelectorAll('#view-tabs [data-bs-toggle="tab"]').forEach(tab =>
    tab.addEventListener('shown.bs.tab', renderActiveView));

/* ---------- Démarrage ---------- */

app.structIds = readStructIdsFromUrl();
load();
