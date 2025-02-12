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
        return this._authors.length > 0 ? `${this._authors[0]} et al.`: '';
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
        "IA Explicable : proposition d'alternatives efficaces à l’indice de Shapley",
        'IA Explicable',
        'projects/1/images/1.png',
        ['Sébastien Harispe', 'Charles Condevaux', 'Stéphane Mussard'],
        'projects/1/project.html'
    ),
    new Project(
        'Symposium international IEEE/ACM sur la simulation distribuée et les applications en temps réel',
        'Symposium international IEEE/ACM',
        'projects/2/images/1.png',
        ['Gregory Zacharewicz'],
        'projects/2/project.html'
    ),
    new Project(
        'Duis leo sem, commodo id aliquet vitae, auctor vel ligula',
        'IA Explicable',
        'https://picsum.photos/id/30/640/360',
        ['Daclin N.'],
        'projects/project_test/boilerplate.html'
    ),
    new Project(
        'Curabitur blandit',
        'IA Explicable',
        'https://picsum.photos/id/40/640/360',
        ['Xu B.'],
        'projects/project_test/boilerplate.html'
    ),
    new Project(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
        'IA Explicable',
        'https://picsum.photos/id/50/640/360',
        ['Urtado C.'],
        'projects/project_test/boilerplate.html'
    )
];