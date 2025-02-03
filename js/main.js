const HEADER_TITLE = {
    id: 'header-title',
    text: 'Portfolio of CERIS'
};
const HEADER_SECONDARY_TEXT = {
    id: 'header-secondary-text',
    text: 'Sed mattis, enim id dignissim bibendum, quam lacus suscipit ligula, quis tempus massa libero eu velit. Aliquam eleifend faucibus nunc, sit amet dictum ex scelerisque molestie.'
};

/* Init */
(function() {
    /* Header */
    [HEADER_TITLE, HEADER_SECONDARY_TEXT].forEach(obj => {
        let tag = document.querySelector(`#${obj.id}`);
        tag.textContent = obj.text;
    });
})();