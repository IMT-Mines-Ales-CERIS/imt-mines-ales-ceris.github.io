/* Init */
(function() {
    let currentPath = window.location.pathname;
    let nbFolders = currentPath.split('/').length - 1;
    let imagePath = `${"../".repeat(nbFolders)}images/logo-hceres.png`;
    let faviconPath = `${"../".repeat(nbFolders)}images/favicon.png`;
    let tagContent = `
        <div class="bg-image-index padding-image-index">
            <div class="container d-flex flex-column">
                <div class="col-lg">
                    <h1 class="fw-light">Portfolio SyCoIA</h1>
                    <p class="lead text-body-light">Systèmes Complexes et Intelligence Artificielle</p>
                </div>
                <div id="logo">
                    <img src="${imagePath}" class="img-fluid w-25" alt="...">
                </div>
            </div>
        </div>`;
    let headerTag = document.querySelector('#header');
    if (headerTag) {
        headerTag.innerHTML = tagContent;
    }
    /* Favicon */
    let faviconTag = document.createElement('link');
    faviconTag.setAttribute('rel', 'icon');
    faviconTag.setAttribute('type', 'image/x-icon');
    faviconTag.setAttribute('href', faviconPath);
    let head = document.querySelector('head');
    head.appendChild(faviconTag);
})();