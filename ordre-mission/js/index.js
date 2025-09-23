// Transport tag model.
let baseTag = document.querySelector(`#transport-base`);
let cloneTag = baseTag.cloneNode(true);

// When switch is used.
// ToogleRequired(cloneTag);

SelectionModifier('service-selection', 'service-details', 'list1', 1);
// SelectionModifier('vehicle-selection', 'vehicle-details', 'list3', 1);
SelectionModifier('transport-selection', 'transport-details', 'list6', 1);


// SwitchDisplay('plane-switch', 'plane-content');
// SwitchDisplay('train-switch', 'train-content');
// SwitchDisplay('vehicle-switch', 'vehicle-content');
// SwitchDisplay('transport-switch', 'transport-content');

// let switchFreeCharge = document.querySelector('#free-charge');
// switchFreeCharge.addEventListener('change', (e) => {
//     let serviceSelection = document.querySelector('#service-selection');
//     let serviceDetails = document.querySelector('#service-details');
//     RemoveChildren('service-selection', 0, serviceSelection.children.length);
//     SelectionModifier('service-selection', 'service-details', 'list1', 1);
//     let select = serviceSelection.firstChild;
//     select.disabled = e.target.checked;
//     if (e.target.checked) {
//         select.options[0].textContent = 'Aucun bénéficiare';
//         serviceDetails.textContent = '';
//     }
// });

let verifyBtn = document.querySelector('#verify');
verifyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    Verify();
});

let saveBtn = document.querySelector('#save');
saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    Print();
});

let ignorePrintBtn = document.querySelector('#ignore-print');
ignorePrintBtn.addEventListener('click', () => {
    const forms = document.querySelectorAll('.needs-validation');
    WindowPrint();
})

let textarea = document.querySelectorAll('textarea');
Array.from(textarea).forEach(el => {
    el.addEventListener('input', () => AutoResize(el));
});

let addTransportBtn = document.querySelector('#btn-plus');
addTransportBtn.addEventListener('click', NewTransportEvent());

InputDateEvent();