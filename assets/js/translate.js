/**
 * Modulo per la traduzione.
 * 
 * TODO: spostare in assets/js
 */
const path = require('path'),
    fs = require('fs'),
    electron = require('electron'),
    app = electron.app ? electron.app : electron.remote.app,
    data = loadData(app.getLocale()),
    U = require('./utils.js');

const SPECIAL = {
    $appName: app.getName()
}

// className: classe css
// from: attributo da cui leggere il testo da tradurre
// into: attributo in cui scrivere il testo tradatto
// NB: non possono essere usati attributi custom, ma solo quelli recuperabili con Element[attribute]
const CLASSES = [
    { className: 'trx-content', from: 'innerHTML', into: 'innerHTML' },
    { className: 'trx-placeholder', from: 'placeholder', into: 'placeholder' },
    { className: 'trx-title', from: 'title', into: 'title' }
];

function loadData(language) {
    let res = path.join(__dirname, '..', '/locales', language + '.json');
    if (!fs.existsSync(res)) {
        res = path.join(__dirname, '..', '/locales/en.json');
    }
    return JSON.parse(fs.readFileSync(res, 'utf8'));
}

/**
 * Traduce il testo nella lingua corrente.
 * Sono previste anche voci spaciali (vedi SPECIAL).
 * Sostituisce tutte le occorrenze %n (dove n è un numero maggiore di zero)
 * con i rispettivi valori recuperati dai parametri successivi a text. 
 * 
 * Es.: translate("xxx %1 yyy %2", "a", "b") => "xxx a yyy b"
 *
 * @param      {string}  text    Il testo da tradurre
 * @param      {Array}   args    I valori da sostituire a %n, opzionali
 * @return     {string}  il testo tradotto
 */
function translate(text, ...args) {
    const tr = SPECIAL[text] || data[text];
    if (tr != null) {
        text = tr;
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
        // per ogni classe css
        CLASSES.forEach(cl => {
            // applico le traduzioni sull'elemento stesso
            el.classList.contains(cl.className) && (el[cl.into] = translate(el[cl.from]));
            // e su tutti i suoi figli
            if (deep) {
                [...el.getElementsByClassName(cl.className)].forEach(el => {
                    // console.log(cl.from, cl.into, el, translate(el[cl.from]))
                    el[cl.into] = translate(el[cl.from])
                });
            }
        })
    });
}

module.exports = {
    translate,
    applyToDom
}