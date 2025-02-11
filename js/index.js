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
                            <a href="${project.pageLink}" class="btn btn-sm btn-outline-secondary">Lire</a>
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