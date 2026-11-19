// @ts-check

/**
 * Minuscules, sans accents ni ponctuation.
 * @param {string} s
 */
export function normText(s) {
    return String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Clé d'auteur indépendante de l'ordre prénom/nom.
 * @param {string} s
 */
export function personKey(s) {
    return normText(s).split(' ').filter(Boolean).sort().join(' ');
}

/**
 * Création d'élément DOM sûre (aucune injection HTML : les textes passent par textContent).
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {...(Node|string|null|undefined)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children) {
        if (c === null || c === undefined) continue;
        el.append(c);
    }
    return el;
}

/**
 * @param {(...args: any[]) => void} fn
 * @param {number} ms
 */
export function debounce(fn, ms) {
    /** @type {any} */
    let t;
    return (/** @type {any[]} */ ...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

/**
 * @template T
 * @param {Map<T, number>} map
 * @param {number} n
 * @returns {[T, number][]}
 */
export function topN(map, n) {
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
