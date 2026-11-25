import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAffiliations, fetchAffiliationCountries } from '../js/hal.js';
import { countCountries } from '../js/countries.js';

test('extrait les affiliations et repère les auteurs sans lien exploitable', () => {
    const forms = ['Alice_FacetSep_10-0', 'Bob_FacetSep_20-3'];
    const links = [
        '10-0_FacetSep_Alice_JoinSep_42_FacetSep_Université',
        '10-0_FacetSep_Alice_JoinSep_42_FacetSep_Université',
        '20-3_FacetSep_Bob_JoinSep_0_FacetSep_Inconnu',
    ];
    assert.deepEqual(extractAffiliations(forms, links), { affiliationIds: [42], incompleteAffiliations: true });
    links[2] = '20-3_FacetSep_Bob_JoinSep_43_FacetSep_Laboratoire';
    assert.deepEqual(extractAffiliations(forms, links), { affiliationIds: [42, 43], incompleteAffiliations: false });
    assert.equal(extractAffiliations([], []).incompleteAffiliations, true);
    assert.equal(extractAffiliations(forms, links, 3).incompleteAffiliations, true);
});

test('compte chaque publication une seule fois par pays étranger et signale les lacunes', () => {
    const pubs = [
        { affiliationIds: [1, 2, 3, 4, 6], incompleteAffiliations: false },
        { affiliationIds: [2, 5, 7], incompleteAffiliations: true },
        { affiliationIds: [1, 7], incompleteAffiliations: false },
        { affiliationIds: [1, 8], incompleteAffiliations: false },
    ];
    const countries = new Map([[1, 'FR'], [2, 'DE'], [3, 'DE'], [4, 'US'], [6, 'RE'], [7, '--']]);
    const { counts, incomplete } = countCountries(pubs, countries);
    assert.deepEqual([...counts], [['DE', 2], ['US', 1]]);
    assert.equal(incomplete, 3);
    assert.deepEqual([...countCountries([], countries).counts], []);
});

test('récupère les pays des structures par lots et propage les erreurs HAL', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    try {
        globalThis.fetch = async url => {
            calls.push(new URL(url));
            return { ok: true, json: async () => ({ response: { docs: [{ docid: '1', country_s: 'fr' }] } }) };
        };
        const countries = await fetchAffiliationCountries(Array.from({ length: 101 }, (_, i) => i + 1));
        assert.equal(calls.length, 2);
        assert.equal(calls[0].searchParams.get('rows'), '100');
        assert.equal(calls[1].searchParams.get('rows'), '1');
        assert.equal(countries.get(1), 'FR');
        globalThis.fetch = async () => ({ ok: false, status: 503 });
        await assert.rejects(fetchAffiliationCountries([1]), /503/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
