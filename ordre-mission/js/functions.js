function CreateSelect(options) {
    let select = document.createElement('select');
    select.classList.add("form-select")
    for (let id in options) {
        let option = document.createElement('option')
        option.value = id;
        option.textContent = options[id];
        select.appendChild(option)
    }
    return select;
}

function RemoveChildren(idNode, start, end) {
    let node = document.querySelector(`#${idNode}`);
    for (let i = end - 1; i >= start ; i--) {
        let child = node.children[i];                
        child.parentNode.removeChild(child);
    }
}

function SelectionModifier(idChoice, idDetails, nodeId, depth) {
    let choice = document.querySelector(`#${idChoice}`);
    let details = document.querySelector(`#${idDetails}`);

    let node = nodeIds[nodeId];
    let el;
    
    if (node.type == 'select') {
        choice.style.gridTemplateColumns = `repeat(${depth}, 1fr)`;
        el = CreateSelect(node.options);
        el.addEventListener('change', (e) => {
            RemoveChildren(idChoice, depth, choice.children.length);
            details.textContent = '';
            choice.style.gridTemplateColumns = `repeat(${depth}, 1fr)`; // We put it back at its correct depth.
            if (e.target.value in NODE_LINKS) {
                SelectionModifier(idChoice, idDetails, NODE_LINKS[e.target.value], depth + 1);
            }
        });
        for (let attribute in node.attributes) {
            el.setAttribute(attribute, node.attributes[attribute]);
        }    
        choice.appendChild(el);            
    } else if (node.type == 'detail') {
        for (let element of node.elements) {
            if (element.type == 'select') {
                el = CreateSelect(element.options);
            } else {
                el = document.createElement(element.type);
                el.classList.add('form-control');
            }
            for (let attribute in element.attributes) {     
                el.setAttribute(attribute, element.attributes[attribute]);
            }
            details.appendChild(el);
        }
    }
}

function SwitchDisplay(idSwitch, idContent) {
    let switchButton = document.querySelector(`#${idSwitch}`);
    let content = document.querySelector(`#${idContent}`);
    
    switchButton.addEventListener('change', (e) => {
        if (content.classList.contains('invisible')) {
            content.classList.remove('invisible');
        } else {
            content.classList.add('invisible');
        }
        if (content.classList.contains('cacher-impression')) {
            content.classList.remove('cacher-impression');
        } else {
            content.classList.add('cacher-impression');
        }
        
        ToogleRequired(content);        
    });
}

function ToogleRequired(mainElement) {
    let elements = []
        if (mainElement.querySelectorAll('input').length > 0) {
            elements = [...elements, ...mainElement.querySelectorAll('input')];
        }
        if (mainElement.querySelectorAll('select').length > 0) {
            elements = [...elements, ...mainElement.querySelectorAll('select')];
        }
        if (mainElement.querySelectorAll('textarea').length > 0) {
            elements = [...elements, ...mainElement.querySelectorAll('textarea')];
        }

        for (let el of elements) {
            if (el.getAttribute('required') === null) {
                el.setAttribute('required', '');
            } else {
                el.removeAttribute('required');
            }
        }
}

function NbInvalidElements() {
    let valid = document.querySelectorAll(':is(input, select, textarea):invalid:required');
    return valid.length;
}

function Verify() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.classList.add('was-validated');
    });

    ResizeTextarea();    
}

function WindowPrint() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.classList.remove('was-validated');
    });
    window.print();
}

function Print() {
    let nbInvalidElements = NbInvalidElements();
    console.log(nbInvalidElements);
    
    if (nbInvalidElements != 0) {
        Verify();
        let modalVerification = new bootstrap.Modal(document.getElementById('verification-modal'));
        modalVerification.show();
    } else {
        WindowPrint();
    }    
}

function ResizeTextarea() {
    let textarea = document.querySelectorAll('textarea');
    Array.from(textarea).forEach(el => {
        AutoResize(el);
    });
}

function AutoResize(textarea) {
    textarea.style.height = 'auto';  // Reset height when user remove text.
    textarea.style.height = textarea.scrollHeight + 2 + 'px'; // Adjusts according to content (+2 to remove scrollbar).
}

function NewTransportEvent() {
    let nbTransports = 0;
    return () => {
        AddTransport(baseTag, cloneTag, nbTransports);
        InputDateEvent();
        nbTransports += 1;
    }
}

function AddTransport(baseTag, baseCloneTag, nbTransports) {
    let idSelection = 'transport-selection';
    let idDetails = 'transport-details';

    let cloneTag = baseCloneTag.cloneNode(true);
    let firstDiv = cloneTag.querySelector('div:first-child');
    let title = firstDiv.querySelector('div:first-child');
    let removeBtn = firstDiv.querySelector('button');

    let id1 = `${idSelection}${nbTransports}`;
    let selectionTag = cloneTag.querySelector(`#${idSelection}`);
    selectionTag.id = id1;
    let id2 = `${idDetails}${nbTransports}`;
    let detailsTag = cloneTag.querySelector(`#${idDetails}`);
    detailsTag.id = id2;
    
    let parent = baseTag.parentNode;
    let children = Array.from(parent.children);
    // Setup info and event.
    let idCloneTag = `transport-new-${children.length}`;
    cloneTag.id = idCloneTag;
    title.textContent = `Transport #${children.length + 1}`;
    removeBtn.classList.remove('invisible');
    removeBtn.addEventListener('click', () => {
        cloneTag.parentNode.removeChild(cloneTag);
        UpdateTitleTransport(baseTag);
    });        
    parent.appendChild(cloneTag);
    
    SelectionModifier(id1, id2, 'list6', 1);
    let select = document.querySelector(`#${id1} select`);
    
    select.setAttribute('required', '');
}

function UpdateTitleTransport(baseTag) {
    let parent = baseTag.parentNode;
    let children = Array.from(parent.children);
    children.forEach((element, i) => {
        let firstDiv = element.querySelector('div:first-child');
        let title = firstDiv.querySelector('div:first-child');
        title.textContent = `Transport #${i+1}`;
    });
}


function InputDateEvent() {
    function KeyDown(event) {    
        event.preventDefault();
        return false;
    }
    function Click(event) {
        event.currentTarget.showPicker();
    }
    let inputsDate = document.querySelectorAll('input[type="date"]');
    inputsDate.forEach(inputDate => {
        inputDate.removeEventListener('keydown', KeyDown);
        inputDate.addEventListener('keydown', KeyDown);
        inputDate.removeEventListener('click', Click);
        inputDate.addEventListener('click', Click);
    });
}

