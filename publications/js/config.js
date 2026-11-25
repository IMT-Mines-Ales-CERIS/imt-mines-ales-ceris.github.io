// @ts-check

/** Structures HAL affichées par défaut (surchargées par ?structId=1,2,3 dans l'URL). */
export const DEFAULT_STRUCT_IDS = [1451414, 1100796];

export const HAL_API = 'https://api.archives-ouvertes.fr';

/** Alias non reliés à un identifiant dans le référentiel d'auteurs HAL. */
export const AUTHOR_ALIAS_GROUPS = [
    {
        key: 'hal:1240158',
        name: 'Gustavo Andrade-Miranda',
        aliases: ['G. Andrade-Miranda', 'G Andrade-Miranda', 'Gustavo Andrade-Miranda', 'Gustavo X Andrade-Miranda'],
    },
];

/** Nombre de documents demandés par appel à l'API (HAL accepte jusqu'à 10000). */
export const HAL_PAGE_ROWS = 500;

export const PAGE_SIZE = 20;

export const HAL_FIELDS = [
    'halId_s', 'uri_s', 'title_s', 'authFullName_s', 'authFullNameIdFormPerson_fs', 'authIdHasStructure_fs', 'keyword_s', 'abstract_s',
    'producedDateY_i', 'conferenceTitle_s', 'journalTitle_s', 'docType_s',
].join(',');

/** @type {Record<string, string>} */
export const DOC_TYPE_LABELS = {
    ART: 'Article de revue',
    COMM: 'Communication',
    POSTER: 'Poster',
    COUV: "Chapitre d'ouvrage",
    OUV: 'Ouvrage',
    PROCEEDINGS: 'Actes de conférence',
    THESE: 'Thèse',
    HDR: 'HDR',
    MEM: 'Mémoire',
    REPORT: 'Rapport',
    SOFTWARE: 'Logiciel',
    BLOG: 'Billet de blog',
    PATENT: 'Brevet',
    ISSUE: 'Numéro spécial',
    OTHER: 'Autre',
    UNDEFINED: 'Non défini',
};

export const PALETTE = [
    '#153a43', '#ff7c4d', '#2a9d8f', '#e9c46a', '#8d6a9f',
    '#5b8def', '#c44569', '#7aa95c', '#9aa5a8', '#b5651d',
];

/** @param {string} code */
export function docTypeLabel(code) {
    return DOC_TYPE_LABELS[code] ?? code;
}
