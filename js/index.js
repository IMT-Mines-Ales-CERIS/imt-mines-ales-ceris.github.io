class Project {
    /**
     * 
     * @param {string} title 
     * @param {string} mainImage 
     * @param {Array<string>} authors 
     */
    constructor(title, mainImage, authors, pageLink) {
        this._title = title;
        this._mainImage = mainImage;
        this._authors = authors;
        this._pageLink = pageLink;
    }

    get title() { return this._title; }
    get mainImage() { return this._mainImage; }
    get pageLink() { return this._pageLink; }

    FirstAuthorEtAl() {
        return this._authors.length > 0 ? `${this._authors[0]} et al.`: '';
    }

}

/** @type Array<Project> */
const PROJECTS = [
    new Project(
        'Sed tristique et velit at cursus',
        'https://picsum.photos/id/10/640/360',
        ['Montmain J.'],
        'projects/project_test/project_test.html'
    ),
    new Project(
        'In hac habitasse platea dictumst: Integer id sollicitudin nunc',
        'https://picsum.photos/id/20/640/360',
        ['Harispe S.'],
        'projects/project_test/project_test.html'
    ),
    new Project(
        'Duis leo sem, commodo id aliquet vitae, auctor vel ligula',
        'https://picsum.photos/id/30/640/360',
        ['Daclin N.'],
        'projects/project_test/project_test.html'
    ),
    new Project(
        'Curabitur blandit',
        'https://picsum.photos/id/40/640/360',
        ['Xu B.'],
        'projects/project_test/project_test.html'
    ),
    new Project(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
        'https://picsum.photos/id/50/640/360',
        ['Urtado C.'],
        'projects/project_test/project_test.html'
    )
];

/* Init */
(function() {
    /* Projects */
    let container = document.querySelector('#row-projects');
    for (let project of PROJECTS) {
        let tagContent = `
            <div class="card shadow-sm">
                <img src="${project.mainImage}" alt="Project image">
                <div class="card-body">
                    <p class="card-text">${project.title}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="btn-group">
                            <a href="${project.pageLink}" class="btn btn-sm btn-outline-secondary">View</a>
                        </div>
                        <small class="text-body-secondary">${project.FirstAuthorEtAl()}</small>
                    </div>
                </div>
            </div>`;
        let tag = document.createElement('div');
        tag.classList.add('col');
        tag.innerHTML = tagContent;
        container.appendChild(tag);
    }
})();