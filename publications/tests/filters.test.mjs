import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyFilters, isActive, matches } from '../js/filters.js';

const publication = {
    year: 2025, docType: 'ART', structs: [1], searchText: '',
    venue: 'International Conference on Robotics',
    authors: [{ key: 'alice', aliases: ['A. Example'] }, { key: 'bob', aliases: [] }],
    keywords: ['Robotique', 'Intelligence artificielle'],
};

test('ET et OU fonctionnent indépendamment pour les auteurs et les mots-clés', () => {
    const f = emptyFilters();
    f.authors = [{ key: 'alice', exact: true }, { key: 'charlie', exact: true }];
    f.keywords = [{ norm: 'robotique', exact: true }, { norm: 'apprentissage', exact: true }];
    assert.equal(matches(publication, f), false);
    f.authorsMode = 'any';
    assert.equal(matches(publication, f), false);
    f.keywordsMode = 'any';
    assert.equal(matches(publication, f), true);
    f.yearMin = 2026;
    assert.equal(matches(publication, f), false);
});

test('les correspondances partielles et les alias restent utilisables en mode OU', () => {
    const f = emptyFilters();
    f.authors = [{ key: 'example', exact: false }, { key: 'charlie', exact: true }];
    f.keywords = [{ norm: 'artificielle', exact: false }, { norm: 'autre', exact: true }];
    f.authorsMode = 'any';
    f.keywordsMode = 'any';
    assert.equal(matches(publication, f), true);
    f.keywords[0].exact = true;
    assert.equal(matches(publication, f), false);
});

test('les conférences sélectionnées et la saisie en cours respectent ET et OU', () => {
    const f = emptyFilters();
    f.venues = ['Robotics', 'ICML'];
    assert.equal(isActive(f), true);
    assert.equal(matches(publication, f), false);
    f.venuesMode = 'any';
    assert.equal(matches(publication, f), true);
    f.venues = ['ICML'];
    f.venue = 'robOtics';
    assert.equal(matches(publication, f), true);
    f.venuesMode = 'all';
    assert.equal(matches(publication, f), false);
    f.venues = [];
    assert.equal(matches(publication, f), true);
    assert.equal(matches({ ...publication, venue: '' }, f), false);
});

test('sans termes sélectionnés les modes ne filtrent pas et ET est le défaut', () => {
    const f = emptyFilters();
    assert.deepEqual([f.authorsMode, f.keywordsMode, f.venuesMode], ['all', 'all', 'all']);
    f.authorsMode = f.keywordsMode = f.venuesMode = 'any';
    assert.equal(isActive(f), false);
    assert.equal(matches(publication, f), true);
});
