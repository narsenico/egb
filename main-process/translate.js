const path = require('path'),
    fs = require('fs'),
    electron = require('electron'),
    app = electron.app ? electron.app : electron.remote.app,
    data = loadData(app.getLocale());

function loadData(language) {
    let res = path.join(__dirname, '..', '/assets/locales', language + '.json');
    if (!fs.existsSync(res)) {
        res = path.join(__dirname, '..', '/assets/locales/en.json');
    }
    return JSON.parse(fs.readFileSync(res, 'utf8'));
}

function translate(text) {
    return data[text] || text;
}

function applyToDom(element) {
	// TODO: parsing element: può essere una query, un elemento, un array di elementi
	// 	cercare data-trx e varianti (es: data-trx-title)
	// 	anche di element e non solo dei figli
    const els = element.querySelectorAll('[data-trx]');
    for (let ii = 0; ii < els.length; ii++) {
        els[ii].innerHTML = translate(els[ii].getAttribute('data-trx') || els[ii].innerHTML);
    }
}

module.exports = {
    translate,
    applyToDom
}