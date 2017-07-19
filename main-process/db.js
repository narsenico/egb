/**
 * Questo modulo si occupa di gestire le voci dell'enciclopedia.
 * I dati sono persistenti e salvati nel file ~/Library/Application\ Support/egb/egbdata.db.
 * 
 * Le voci sono rappresentate dall'oggetto "entry" così definito
 * - name: String, nome univoco, calcolato a partire dal titolo
 * - category: String, categoria
 * - lastUpdate: Date, data ultimo aggiornamento
 * - caption: String, titolo
 * - content: String, contenuto formattato
 * - ref: String, riferimenti all'entry
 * - attachments: [String], allegati
 * - tags: String, elenco di tag
 * 
 * @see https://github.com/louischatriot/nedb
 */
const app = require('electron').app,
    path = require('path'),
    promisify = require('es6-promisify'),
    _ = require('lodash'),
    searchEngine = require('../utils/search-engine.js'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: path.join(app.getPath('userData'), 'egbdata.db'), autoload: true });

// constraint sui dati
db.ensureIndex({ "fieldName": "name", "unique": true });

// modello per una entry, per ogni campo è specificato il tipo, 
//  se è richiesto e se può essere vuoto (solo stringhe)
const EntryModel = {
    "_id": { "type": String, "required": false },
    "name": { "type": String, "required": true, "empty": false },
    "category": { "type": String, "required": false },
    "lastUpdate": { "type": Date, "required": false },
    "caption": { "type": String, "required": true, "empty": false },
    "content": { "type": String, "required": false },
    "ref": { "type": String, "required": false },
    "attachments": { "type": Array, "required": false },
    "tags": { "type": String, "required": false }
};
// campi del documento "entry"
const entryFields = Object.keys(EntryModel);

const removeSpaces = function(text) {
    return text.trim().replace(/\s{2,}/g, ' ');
}
const cleanName = function(name) {
    return removeSpaces(name).toUpperCase();
};
/**
 * Normalizza l'entry:
 * - aggiorna la data di ultima modifica
 * - crea name in base a caption
 * - rimuove gli spazi superflui a category
 * 
 * @param      {Object}  entry   l'istanza di entry da normalizzare
 * @return     {Object}  entry   una copia di entry con i soli campi previsti dal modello EntryModel
 */
const normalizeEntry = function(entry) {
    if (entry.caption) {
        entry.name = cleanName(entry.caption);
    }
    if (entry.category) {
        entry.category = removeSpaces(entry.category);
    }
    entry.lastUpdate = new Date();
    return _.pick(entry, entryFields);
};
/**
 * Valida un entry.
 *
 * @param      {Object}             entry   l'istanza da validare
 * @return     {(Error|TypeError)}  undefined se tutto ok, oppure l'errore
 */
const validateEntry = function(entry) {
    for (let field of entryFields) {
        const f = EntryModel[field];
        const v = entry[field];
        if (f.required) {
            if ((v === null || v === undefined) ||
                (f.empty === false && f.type === String && /^\s*$/.test(v))) {
                return new Error(`Entry ${field} can not be empty`);
            }
        }
        // verifico che il tipo del dato sia conforme al modello
        if (v !== null && v !== undefined && v.constructor !== f.type) {
            return new TypeError(`Entry ${field} should be ${f.type.name}`);
        }
    }
};

// trasforma le funzioni "con callback" in modo che ritornino una Promise
//  usare {multiArgs: true} se alla callback vengono passati più di un valore (escluso err)
const _count = promisify(db.count.bind(db));
const _insert = promisify(db.insert.bind(db));
const _update = promisify(db.update.bind(db), { multiArgs: true });
const _find = promisify(db.find.bind(db));
const _findOne = promisify(db.findOne.bind(db));
const _findAndSort = promisify((function(query, sort, cb) {
    this.find(query).sort(sort).exec(cb);
}).bind(db));
const _remove = promisify(db.remove.bind(db));

// tutte le funzioni ritornano una Promise se non è passata la callback
module.exports = {
    "bulkInsert": function(entries, cb) {
        entries = entries.map(normalizeEntry);
        if (cb) {
            db.insert(entries, cb);
        } else {
            return _insert(entries);
        }
    },
    /**
     * Salva una entry.
     * 
     * @param      {Object}    entry   l'istanza da salvare
     * @param      {Function}  cb      (err, numAffected, affectedDocuments, upsert)
     * @return     {Object}    promise
     */
    "save": function(entry, cb) {
        // normalizzo l'entry in modo che vengano considerati solo i campi previsti da Entry
        entry = normalizeEntry(entry);
        // valido l'entry: ritorna undefined se è tutto apposto, altrimenti un Error
        const error = validateEntry(entry);
        if (error) {
            if (cb) {
                return cb(error);
            } else {
                return Promise.reject(error);
            }
        }
        // se l'entry possiede un _id lo uso, perché nel frattempo potrebbe aver cambiato nome
        const query = (entry._id ? { "_id": entry._id } : { "name": entry.name });
        // aggiorno, sostituendolo, l'entry con lo stesso nome, altrimenti inserisco se non esiste
        if (cb) {
            db.update(query,
                entry,
                // se non esiste esegue un inserimento
                { "upsert": true, "returnUpdatedDocs": true },
                cb);
        } else {
            return _update(query,
                entry,
                // se non esiste esegue un inserimento
                { "upsert": true, "returnUpdatedDocs": true });
        }
    },
    /**
     * Rimuove una entry.
     *
     * @param      {Object}    entry   istanza da rimuovere, oppure name
     * @param      {Function}  cb      {err, numRemoved}
     * @return     {Object}    promise
     */
    "remove": function(entry, cb) {
        const name = entry && entry.name ? entry.name : cleanName(entry);
        if (cb) {
            db.remove({ "name": name }, {}, cb);
        } else {
            return _remove({ "name": name }, {});
        }
    },
    /**
     * Rimuove tutte le entry.
     *
     * @param      {Function}  cb      {err, numRemoved}
     * @return     {Object}    promise
     */
    "clear": function(cb) {
        if (cb) {
            db.remove({}, { "multi": true }, cb);
        } else {
            return _remove({}, { "multi": true });
        }
    },
    /**
     * Cerca l'entry con un dato nome, ignora maiuscole/minuscole.
     *
     * @param      {String}    name    il nome da cercare
     * @param      {Function}  cb      {err, doc}
     * @return     {Object}    promise
     */
    "findByName": function(name, cb) {
        if (cb) {
            db.findOne({ "name": cleanName(name) }).exec(cb);
        } else {
            return _findOne({ "name": cleanName(name) });
        }
    },
    /**
     * Cerca le entry che appartegono ad una certa categoria, ignora maiuscole/minuscole.
     *
     * @param      {String}    category  la categoria
     * @param      {Function}  cb        {err, docs}
     * @return     {Object}    promise
     */
    "findByCategory": function(category, cb) {
        const reCategory = new RegExp(`^\s*${removeSpaces(category)}\s*$`, 'i');
        if (cb) {
            db.find({ "category": { "$regex": reCategory } }).exec(cb);
        } else {
            return _find({ "category": { "$regex": reCategory } });
        }
    },
    /**
     * Estrae entry che soddifano la query di ricerca.
     *
     * @param      {String}    query   La query di ricerca: serie di parole da ricercare nelle proprietà di entry
     * @param      {Function}  cb      {err, [{index, matches, totalWeight}]}
     * @return     {Object}    promise
     */
    "search": function(query, cb) {
        const searchFor = ['name', 'category', 'tags'];
        if (cb) {
            db.find({}, (err, docs) => {
                if (err) return cb(err);
                else return cb(null, searchEngine.byWeight(docs, query, searchFor));
            });
        } else {
            return _find({}).then(docs => searchEngine.byWeight(docs, query, searchFor));
        }
    },
    /**
     * Conta i documenti presenti nel db.
     *
     * @param      {Function}  cb      (err, count)
     * @return     {Object}    promise
     */
    "count": function(cb) {
        if (cb) {
            db.count({}, cb);
        } else {
            return _count({});
        }
    },
    "test": function(result, value) {
        return Promise[result ? 'resolve' : 'reject'](value);
    }
};
