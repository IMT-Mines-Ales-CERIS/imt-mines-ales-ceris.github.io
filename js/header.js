/* Init */
(function() {
    let currentPath = window.location.pathname;
    let nbFolders = currentPath.split('/').length - 1;
    let imagePath = `${"../".repeat(nbFolders)}images/logo.jpg`;
    let faviconPath = `${"../".repeat(nbFolders)}images/favicon.png`;
    let tagContent = `
        <div class="row">
            <div class="col-2" id="logo">
                <img src="${imagePath}" class="img-fluid" alt="...">
            </div>
            <div class="col-lg">
                <h1 class="fw-light">Portfolio SyCoIA</h1>
                <p class="lead text-body-secondary">Systèmes Complexes et Intelligence Artificielle</p>
            </div>
        </div>`;
    let headerTag = document.querySelector('#header');
    headerTag.innerHTML = tagContent;
    /* Favicon */
    let faviconTag = document.createElement('link');
    faviconTag.setAttribute('rel', 'icon');
    faviconTag.setAttribute('type', 'image/x-icon');
    faviconTag.setAttribute('href', faviconPath);
    let head = document.querySelector('head');
    head.appendChild(faviconTag);
})();