class Project {
    /**
     * 
     * @param {string} title 
     * @param {string} mainImage 
     * @param {Array<string>} authors 
     */
    constructor(title, shortTitle, mainImage, authors, pageLink) {
        this._title = title;
        this._shortTitle = shortTitle;
        this._mainImage = mainImage;
        this._authors = authors;
        this._pageLink = pageLink;
    }

    get title() { return this._title; }
    get shortTitle() { return this._shortTitle; }
    get mainImage() { return this._mainImage; }
    get pageLink() { return this._pageLink; }

    FirstAuthorEtAl() {
        if (this._authors.length == 1) {
            return this._authors[0];
        }
        if (this._authors.length > 1) {
            return `${this._authors[0]} et al.`;
        }
        return ''
    }

    FillPage() {
        let shortTitleTag = document.querySelector('#short-title');
        shortTitleTag.textContent = this._shortTitle;
        let fullTitleTag = document.querySelector('#full-title');
        fullTitleTag.textContent = this._title;
    }
}

/** @type Array<Project> */
const PROJECTS = [
    new Project(
        "IA Explicable : proposition d'alternatives efficaces à l'indice de Shapley",
        'IA Explicable',
        'projects/1/images/1.png',
        ['Sébastien Harispe', 'Charles Condevaux', 'Stéphane Mussard'],
        'projects/1/project.html'
    ),
    new Project(
        'Symposium international IEEE/ACM sur la simulation distribuée et les applications en temps réel',
        'Symposium international IEEE/ACM',
        'projects/2/images/3.png',
        ['Gregory Zacharewicz'],
        'projects/2/project.html'
    ),
    new Project(
        'Bug ou pas : telle est la question !',
        'Bug ou pas : telle est la question !',
        'projects/3/images/1.png',
        ['Quentin Perez', 'Pierre-Antoine Jean', 'Christelle Urtado', 'Sylvain Vauttier'],
        'projects/3/project.html'
    ),
    new Project(
        "Les Chaires du CERIS (2019 - 2030)",
        'Les Chaires du CERIS',
        'projects/4/images/9.png',
        ['Vincent Chapurlat'],
        'projects/4/project.html'
    ),
    new Project(
        'Classification prudente basée sur la théorie des fonctions de croyance et réétiquetage imprécis',
        'Classification prudente et réétiquetage imprécis',
        'projects/5/images/2.png',
        ['Abdelhak Imoussaten', 'Lucie Jacquin'],
        'projects/5/project.html'
    )
];