// @ts-check

import { DEBUG } from "./constants.js";

export class Publication {
    #uri_s;
    #title_s;
    #authFullName_s;
    #keyword_s;
    #abstract_s;
    #producedDateY_i;
    #publisher_s;
    #conferenceTitle_s;
    #journalTitle_s;

    /**
     * @typedef {Object} PublicationData
     * @property {string} uri_s
     * @property {string[]} title_s
     * @property {string[]} authFullName_s
     * @property {string[]} keyword_s
     * @property {string[]} abstract_s
     * @property {number} producedDateY_i
     * @property {string[]} publisher_s
     * @property {string} conferenceTitle_s
     * @property {string} journalTitle_s
     */

    /**
     * @param {PublicationData} data
     */
    constructor(data) {
        this.#uri_s = data.uri_s ?? null;
        this.#title_s = data.title_s ?? null;
        this.#authFullName_s = data.authFullName_s ?? null;
        this.#keyword_s = data.keyword_s ?? null;
        this.#abstract_s = data.abstract_s ?? null;
        this.#producedDateY_i = data.producedDateY_i ?? null;
        this.#publisher_s = data.publisher_s ?? null;
        this.#conferenceTitle_s = data.conferenceTitle_s ?? null;
        this.#journalTitle_s = data.journalTitle_s ?? null;
    }

    // --- Accesseurs publics ---
    get uri() { return this.#uri_s; }
    get first_title() { return this.#title_s ? this.#title_s[0]: ''; }
    get titles() { return this.#title_s; }
    get authors() { return this.#authFullName_s; }
    get keywords() { return this.#keyword_s; }
    get abstracts() { return this.#abstract_s; }
    get year() { return this.#producedDateY_i; }
    get publishers() { return this.#publisher_s; }
    get conference() { return this.#conferenceTitle_s; }
    get journal() { return this.#journalTitle_s; }

    is_valid() {
        return this.#uri_s && this.#title_s && this.#authFullName_s;
    }

    publish_in() {
        if (this.#conferenceTitle_s) {
            return this.#conferenceTitle_s;
        } else if (this.#publisher_s) {
            return this.#publisher_s.join(', ');
        } else if (this.#journalTitle_s) {
            return this.#journalTitle_s;
        } else {
            return null;
        }
    }
}

export class Hal {
    #numFound;

    constructor() {
        this.#numFound = 0;
    }

    get num_found() { return this.#numFound; }
    
    /**
     * 
     * @param {number} rows 
     */
    async fetch(rows) {
        try {
            let resultat;
            if (DEBUG) {
                resultat = data_test;
            } else {
                const reponse = await fetch(`https://api.archives-ouvertes.fr/search/?q=structId_i:1100796&&fl=title_s,authFullName_s,keyword_s,abstract_s,producedDateY_i,publisher_s,conferenceTitle_s,degree_s,book_s,uri_s,journalTitle_s&sort=producedDateY_i%20desc,docid%20desc&rows=${rows}`, {
                    method: "GET",
                });
                resultat = await reponse.json();
            }
            this.#numFound = resultat.response.numFound;
            // @ts-ignore
            let publications = resultat.response.docs.map(el => new Publication(el));
            if (DEBUG) {                        
                publications = publications.slice(0, rows);                        
            }
            
            return publications;
            
        } catch (err) {
            console.error(err);
            return [];
        }
    }
}

export let hal = new Hal();

