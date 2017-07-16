/**
 * Questo modulo si occupa di gestire le voci dell'enciclopedia.
 * I dati sono persistenti e salvati nel file ~/Library/Application\ Support/egb/egbdata.db.
 * 
 * Le voci sono rappresentate dall'oggetto "entry" così definito
 * { name: String, 
 *  category: String, 
 *  lastUpdate: Date, 
 *  content: String, 
 *  ref: String,
 *  attachments: [String], 
 *  tags: [String] }
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
// TODO: serve davvero un indice su name? si può usare _id (che contiene il name "normalizzato") per ordinare
//  tanto la ricerca verrà sempre fatta su più campi (name, tags, category)
db.ensureIndex({ "fieldName": "name", "unique": true });

// modello per una entry, per ogni campo è specificato il tipo, 
//  se è richiesto e se può essere vuoto (solo stringhe)
const EntryModel = {
    "_id": { "type": String, "required": true, "empty": false },
    "name": { "type": String, "required": true, "empty": false },
    "category": { "type": String, "required": true },
    "lastUpdate": { "type": Date, "required": false },
    "content": { "type": String, "required": false },
    "ref": { "type": String, "required": false },
    "attachments": { "type": Array, "required": false },
    "tags": { "type": Array, "required": false }
};
// campi del documento "entry"
const entryFields = Object.keys(EntryModel);

/**
 * Ritorna _id partendo dal nome.
 *
 * @param      {string}  name    la proprietà name di entry
 * @return     {string}  _id
 */
const idByName = function(name) {
    
// TODO: rimuovere tutti i doppi spazi

    return name.trim().toUpperCase();
};
/**
 * 
 * Imposta _id come l'uppercase trimmato del nome, aggiorna la data di ultima modifica.
 *
 * @param      {Object}  entry   l'istanza di entry da normalizzare
 * @return     {Object}  entry   una copia di entry con i soli campi previsti dal modello EntryModel
 */
const normalizeEntry = function(entry) {
    if (entry.name) {
        entry.name = entry.name.toString();
        entry._id = idByName(entry.name);
    }
    entry.lastUpdate = new Date();
    return _.pick(entry, entryFields);
};
/**
 * Elabora la stringa "query" e crea un oggetto da passare come filtro a db.find()
 *
 * @param      {String}  query   una stringa contenente i termini della ricerca
 * @return     {Object}  un oggetto da passare a db.find()
 */
const parseQuery = function(query) {
    // TODO
    return {};
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
        // aggiorno, sostituendolo, l'entry con lo stesso nome, altrimenti inserisco se non esiste
        if (cb) {
            db.update({ "_id": entry._id },
                entry,
                // se non esiste esegue un inserimento
                { "upsert": true, "returnUpdatedDocs": true },
                cb);
        } else {
            return _update({ "_id": entry._id },
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
        const _id = idByName(entry && entry.name ? entry.name : entry);
        if (cb) {
            db.remove({ "_id": _id }, {}, cb);
        } else {
            return _remove({ "_id": _id }, {});
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
     * La ricerca in realtà verrà effettuata sul campo _id.
     *
     * @param      {String}    name    il nome da cercare
     * @param      {Function}  cb      {err, doc}
     * @return     {Object}    promise
     */
    "findByName": function(name, cb) {
        if (cb) {
            db.findOne({ "_id": idByName(name) }).exec(cb);
        } else {
            return _findOne({ "_id": idByName(name) });
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
        const reCategory = new RegExp(`^\s*${category}\s*$`, 'i');
        if (cb) {
            db.find({ "category": { "$regex": reCategory } }).exec(cb);
        } else {
            return _find({ "category": { "$regex": reCategory } });
        }
    },
    "search": function(query, cb) {
        if (cb) {
            db.find({}, (err, docs) => {
                if (err) return cb(err);
                else return cb(null, searchEngine.byWeight(docs, query));
            });
        } else {
            return _find({}).then(docs => searchEngine.byWeight(docs, query));
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
