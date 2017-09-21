/**
 * Modulo per la traduzione.
 */
const path = require('path'),
    fs = require('fs'),
    electron = require('electron'),
    app = electron.app ? electron.app : electron.remote.app,
    data = loadData(app.getLocale()),
    U = require('../assets/js/utils.js');

const CLASSES = [
    { className: 'trx-content', attribute: 'innerHTML' },
    { className: 'trx-placeholder', attribute: 'placeholder' },
    { className: 'trx-title', attribute: 'title' }
];

function loadData(language) {
    let res = path.join(__dirname, '..', '/assets/locales', language + '.json');
    if (!fs.existsSync(res)) {
        res = path.join(__dirname, '..', '/assets/locales/en.json');
    }
    return JSON.parse(fs.readFileSync(res, 'utf8'));
}

/**
 * Traduce il testo nella lingua corrente.
 * Sostituisce tutte le occorrenze %n (dove n è un numero maggiore di zero)
 * con i rispettivi valori recuperati dai parametri successivi a text. 
 * 
 * Es.: translate("xxx %1 yyy %2", "a", "b") => "xxx a yyy b"
 *
 * @param      {string}  text    Il testo da tradurre
 * @param      {Array}   args    I valori da sostituire a %n
 * @return     {string}  il testo tradotto
 */
function translate(text, ...args) {
    if (data[text] != null) {
        text = data[text];
    }

    if (args && args.length > 0) {
        // TODO: considerare %% come escape per %
        return text.replace(/(\%\d{1,})/g, function(match) {
            return args[+match.substring(1) - 1];
        });
    } else {
        return text;
    }
}

function applyToDom(selector = document, deep = true) {
    // selector: può essere una query, un elemento, un array di elementi
    U.parseSelector(selector).forEach(el => {
        CLASSES.forEach(cl => {
            // applico le traduzioni sull'elemento stesso
            el.classList.contains(cl.className) && (el[cl.attribute] = translate(el[cl.attribute]));
            // e su tutti i suoi figli
            if (deep) {
                [...el.getElementsByClassName(cl.className)].forEach(el => {
                    el[cl.attribute] = translate(el[cl.attribute])
                });
            }
        })
    });
}

module.exports = {
    translate,
    applyToDom
}