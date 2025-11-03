// @ts-check

class Publication {
    constructor() {}
}

try {
    const TAG_IDS = {
        wc_main:    'wc-main',
        title:      'pub-title',
        author:     'pub-author',
        keyword:    'pub-keywords',
        publisher:  'pub-publisher',
    };

    // https://api.archives-ouvertes.fr/search/?q=structId_i:1100796&&fl=title_s,authFullName_s,keyword_s,abstract_s,producedDateY_i,publisher_s,conferenceTitle_s,degree_s,book_s,uri_s&sort=producedDateY_i%20desc&rows=5

    (function() {
        const PAGE_NAME = 'publication-item';

        const TEMPLATE = document.createElement('template');
        TEMPLATE.innerHTML = /* html */`

            <style>
                .publication-item {
                    border-left: 3px solid var(--primary-text);
                }

                .publication-item:hover {
                    border-left-color: var(--vermillion-light);
                }
            </style>

            <div id="${TAG_IDS.wc_main}">
                <div class="col-12">
                    <div class="publication-item base-radius-16 base-shadow p-4">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h5 class="fw-semibold mb-2" id="${TAG_IDS.title}">Deep Learning Approaches for Real-Time Object Detection in Autonomous Systems</h5>
                                <p class="text-muted small mb-3" id="${TAG_IDS.author}">M. Durand, C. Dubois, J. Moreau</p>
                                <div class="d-flex gap-2 mb-3 flex-wrap" id="${TAG_IDS.keyword}">
                                    <span class="badge badge-config">Intelligence Artificielle</span>
                                    <span class="badge badge-config">Vision par ordinateur</span>
                                </div>
                                <p class="small text-muted mb-0" id="${TAG_IDS.publisher}">IEEE Transactions on Neural Networks and Learning Systems, 2024</p>
                            </div>
                            <a href="#" class="btn btn-outline-secondary btn-sm ms-3">
                                <i data-lucide="external-link" style="width: 16px; height: 16px;"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.customElements.define(PAGE_NAME, class extends HTMLElement {
            constructor() {
                super();
            }

            async Hal() {
                try {
                    const reponse = await fetch("https://api.archives-ouvertes.fr/search/?q=structId_i:1100796&&fl=title_s,authFullName_s,keyword_s,abstract_s,producedDateY_i,publisher_s,conferenceTitle_s,degree_s,book_s,uri_s&sort=producedDateY_i%20desc&rows=5", {
                        method: "GET",
                    });
                    const resultat = await reponse.json();
                    console.log("Réussite :", resultat);
                    console.log(resultat.response.docs);
                    
                } catch (erreur) {
                    console.error("Erreur :", erreur);
                }
            }
         
            connectedCallback () {
                this.appendChild(TEMPLATE.content.cloneNode(true));
                this._content = this.querySelector(`#${TAG_IDS.wc_main}`);

                // this.Hal();
            }
          
            disconnectedCallback () {}
        });
    })();
}
catch (err) {
    console.error(err);
}