// @ts-check

import { fetchAffiliationCountries } from './hal.js';
import { h } from './util.js';

/** @typedef {import('./hal.js').Publication} Publication */
/** @typedef {{ id: string|number, properties: { name: string } }} MapFeature */

const FRANCE_CODES = new Set(['FR', 'GF', 'GP', 'MQ', 'RE', 'YT', 'BL', 'MF', 'PM', 'WF', 'PF', 'NC', 'TF']);
let mapTransform = { x: 0, y: 0, k: 1 };

/**
 * @param {Publication[]} pubs
 * @param {Map<number, string>} countries
 */
export function countCountries(pubs, countries) {
    /** @type {Map<string, number>} */
    const counts = new Map();
    let incomplete = 0;
    for (const pub of pubs) {
        const codes = new Set();
        let missing = pub.incompleteAffiliations;
        for (const id of pub.affiliationIds) {
            const code = countries.get(id);
            if (!code || !/^[A-Z]{2}$/.test(code)) missing = true;
            else if (!FRANCE_CODES.has(code)) codes.add(code);
        }
        if (missing) incomplete++;
        for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return { counts, incomplete };
}

/** @param {string} url */
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Impossible de charger ${url} (${response.status}).`);
    return response.json();
}

/** @param {Publication[]} pubs */
export async function loadCountryData(pubs) {
    const ids = [...new Set(pubs.flatMap(pub => pub.affiliationIds))];
    const [countries, topology, isoCodes] = await Promise.all([
        fetchAffiliationCountries(ids),
        fetchJson('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
        fetchJson('https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.14.0/codes.json'),
    ]);
    return { countries, topology, isoCodes };
}

/**
 * @param {HTMLElement} container
 * @param {HTMLElement} legend
 * @param {HTMLElement} list
 * @param {Map<string, number>} counts
 * @param {{ objects: { countries: unknown } }} topology
 * @param {string[][]} isoCodes
 */
export function renderCountries(container, legend, list, counts, topology, isoCodes) {
    // @ts-ignore D3 et topojson sont fournis par les CDN.
    if (typeof d3 === 'undefined' || typeof topojson === 'undefined') throw new Error('La bibliothèque cartographique est indisponible.');
    // @ts-ignore Bibliothèques fournies par les CDN.
    const features = topojson.feature(topology, topology.objects.countries).features;
    const alphaByNumeric = new Map(isoCodes.map(code => [code[2], code[0]]));
    const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
    const name = (/** @type {string} */ code) => /^[A-Z]{2}$/.test(code) ? regionNames.of(code) ?? code : code;
    const max = Math.max(0, ...counts.values());
    // @ts-ignore Bibliothèque fournie par le CDN.
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, Math.max(1, max)]);
    const mapped = new Set(features.map((/** @type {MapFeature} */ feature) => alphaByNumeric.get(String(feature.id).padStart(3, '0'))));

    container.replaceChildren();
    const zoomOut = /** @type {HTMLButtonElement} */ (h('button', {
        type: 'button', class: 'btn btn-sm btn-outline-secondary', 'aria-label': 'Dézoomer la carte', title: 'Dézoomer', text: '−',
    }));
    const zoomIn = /** @type {HTMLButtonElement} */ (h('button', {
        type: 'button', class: 'btn btn-sm btn-outline-secondary', 'aria-label': 'Zoomer la carte', title: 'Zoomer', text: '+',
    }));
    container.append(h('div', { class: 'd-flex gap-2 mb-2', role: 'group', 'aria-label': 'Zoom de la carte' }, zoomIn, zoomOut));
    // @ts-ignore Bibliothèque fournie par le CDN.
    const projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [992, 492]], { type: 'FeatureCollection', features });
    // @ts-ignore Bibliothèque fournie par le CDN.
    const svg = d3.select(container).append('svg').attr('viewBox', '0 0 1000 500')
        .attr('role', 'img').attr('aria-label', 'Carte des publications par pays d’affiliation hors France');
    // @ts-ignore Bibliothèque fournie par le CDN.
    const path = d3.geoPath(projection);
    const map = svg.append('g');
    // @ts-ignore Bibliothèque fournie par le CDN.
    const zoom = d3.zoom().scaleExtent([1, 8]).extent([[0, 0], [1000, 500]]).translateExtent([[0, 0], [1000, 500]])
        .on('zoom', (/** @type {{ transform: { x: number, y: number, k: number, toString: () => string } }} */ event) => {
            mapTransform = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
            map.attr('transform', event.transform.toString());
            zoomOut.disabled = mapTransform.k <= 1;
            zoomIn.disabled = mapTransform.k >= 8;
        });
    svg.call(zoom).on('wheel.zoom', null).on('dblclick.zoom', null);
    // @ts-ignore Bibliothèque fournie par le CDN.
    svg.call(zoom.transform, d3.zoomIdentity.translate(mapTransform.x, mapTransform.y).scale(mapTransform.k));
    zoomIn.addEventListener('click', () => svg.call(zoom.scaleBy, 2));
    zoomOut.addEventListener('click', () => svg.call(zoom.scaleBy, 0.5));

    map.selectAll('path').data(features).join('path')
        .attr('d', path)
        .attr('fill', (/** @type {MapFeature} */ feature) => {
            const code = alphaByNumeric.get(String(feature.id).padStart(3, '0'));
            return code && counts.has(code) ? color(counts.get(code)) : '#e5e9e9';
        })
        .attr('stroke', '#fff').attr('stroke-width', 0.6)
        .attr('tabindex', (/** @type {MapFeature} */ feature) => counts.has(alphaByNumeric.get(String(feature.id).padStart(3, '0')) ?? '') ? 0 : null)
        .attr('aria-label', (/** @type {MapFeature} */ feature) => {
            const code = alphaByNumeric.get(String(feature.id).padStart(3, '0'));
            return code && counts.has(code) ? `${name(code)} : ${counts.get(code)} publication(s)` : null;
        })
        .append('title').text((/** @type {MapFeature} */ feature) => {
            const code = alphaByNumeric.get(String(feature.id).padStart(3, '0'));
            return code ? `${name(code)} : ${counts.get(code) ?? 0} publication(s)` : feature.properties.name;
        });

    legend.replaceChildren(...(max ? [
        h('span', { text: 'Moins ' }),
        h('span', { class: 'countries-gradient', 'aria-hidden': 'true' }),
        h('span', { text: ` Plus · maximum : ${max} publication(s) par pays` }),
    ] : [h('span', { text: 'Aucun pays partenaire trouvé pour ces filtres.' })]));
    const sorted = [...counts].sort((a, b) => b[1] - a[1] || name(a[0]).localeCompare(name(b[0])));
    list.replaceChildren(...(sorted.length ? [
        h('h4', { class: 'h6 fw-bold', text: 'Publications par pays' }),
        h('ul', { class: 'small mb-0' }, ...sorted.map(([code, count]) =>
            h('li', { text: `${name(code)} : ${count}${mapped.has(code) ? '' : ' (non représenté sur la carte)'}` }))),
    ] : []));
}
