// separatori di parole
const sep = /[\s,;]/;

function getWordStart(text, index) {
    let ii = index;
    while (!sep.test(text[ii]) && --ii >= 0) {};
    return ++ii;
}

function getWordEnd(text, index) {
    let ii = index;
    while (!sep.test(text[ii]) && ++ii < text.length) {};
    return --ii;
}

// ritonra [indice inizio, lunghezza]
function getWordBounds(text, index) {
    if (index < 0 || index >= text.length) return [index, 0];
    const start = getWordStart(text, index);
    return [start, getWordEnd(text, index) - start + 1];
}

// considera gli elementi dell'array fino a che il predicato è soddisfatto
// se sono tutti gli elementi, viene ritornato l'array
// altrimenti una copia dell'array con i soli elementi verificati
function takeUntil(array, predicate) {
    let index;
    const length = array.length;
    for (index = 0; index < length && predicate(array[index]); index++);
    return index === 0 ? [] : (index === length ? array : array.slice(0, index));
}

module.exports = {
    /**
     * Ricerca utilizzando la query, dando un peso ad ogni entry trovata.
     * Ritorna un array di oggetti {"index", "matches", "totalWeight"}
     * - index: indice dell'entry relativo all'array originale
     * - matches: array di {"match", "index", "weight", "property"}
     *   - match: parola trovata
     *   - index: indice della parola all'interno della proprietà
     *   - weight: peso della parola trovata
     *   - property: proprietà per cui è stata eseguita la ricerca
     * - totalWeight: il peso totale dato al risultato della ricerca per questa entry
     * 
     * L'array è ordinato per totaleWeight decrescente
     *
     * @param      {Array}  entries    Le entry in cui eseguire la ricerca
     * @param      {String}  query      La query di ricerca (una o più parole)
     * @param      {Array}   searchFor  Elenco delle proprietà di Entry per cui eseguire la ricerca, 
     *                                  se vuoto viene usato solo il nome
     * @return     {Array}  Elenco di oggetti {"index", "matches", "totalWeight"}
     */
    "byWeight": function(entries, query, searchFor) {
        console.time('search');

        // separo le singole parole esludendo quelle con pochi caratteri
        const tokens = query.split(sep).filter(t => t.length > 1);
        // creo la regexp con flag i (ignore case) 
        //  e g (con il quale posso loopare per tutti i match nella stringa)
        const re = new RegExp(tokens.join('|'), 'ig');
        console.log(re);

        // se non sono state specificate le proprietà per cui eseguire la ricerca, considero solo il nome
        if (!searchFor || !searchFor.length) {
            searchFor = ['name'];
        }

        const found = takeUntil(entries
            // ritorna un array con tutti i match
            .map((entry, index) => {
                const matches = [];
                let totalWeight = 0;
                let match, weight, wstart, wlen;
                // il loop funziona solo con il flag g
                // ripeto la ricerca per ogni proprietà
                searchFor.forEach(prop => {
                    while ((match = re.exec(entry[prop])) !== null) {
                        // calcolo il peso del match:
                        // - parola intera: 10000
                        // - inizio parola: 1000
                        // - numero di caratteri consecutivi nella parola: 200 ca
                        [wstart, wlen] = getWordBounds(entry[prop], match.index);
                        if (match[0].length === wlen) {
                            weight = 10000;
                        } else if (match.index === wstart) {
                            weight = 1000;
                        } else {
                            weight = 200 * match[0].length;
                        }

                        matches.push({
                            "match": match[0],
                            "index": match.index,
                            "weight": weight,
                            "property": prop
                        });
                        totalWeight += weight;
                    }
                });
                return {
                    "index": index,
                    "entry": entry,
                    "matches": matches,
                    "totalWeight": totalWeight
                };
            })
            // // escludo quelli senza match (a 0)
            // .filter(r => r.matches.length)
            // ordino per il peso
            .sort((a, b) => {
                return b.totalWeight - a.totalWeight;
            }),
            r => r.totalWeight > 0);

        console.timeEnd('search');
        return found;
    },
    "byWeightBound": function(entries, query, searchFor) {
        console.time('search');

        // separo le singole parole esludendo quelle con pochi caratteri
        const tokens = query.split(sep).filter(t => t.length > 1);
        // creo la regexp con flag i (ignore case) 
        //  e g (con il quale posso loopare per tutti i match nella stringa)
        //  composta da tre gruppi: parola intera, inizio parola, qualsiasi
        const re = new RegExp(`(${tokens.map(t => `\\b${t}\\b`).join('|')})|(${tokens.map(t => `\\b${t}`).join('|')})|(${tokens.join('|')})`, 'ig');
        console.log(re);

        // se non sono state specificate le proprietà per cui eseguire la ricerca, considero solo il nome
        if (!searchFor || !searchFor.length) {
            searchFor = ['name'];
        }

        const found = takeUntil(entries
            // ritorna un array con tutti i match
            .map((entry, index) => {
                const matches = [];
                let totalWeight = 0;
                let match, weight, wstart, wlen;
                // il loop funziona solo con il flag g
                // ripeto la ricerca per ogni proprietà
                searchFor.forEach(prop => {
                    while ((match = re.exec(entry[prop])) !== null) {
                        // calcolo il peso del match:
                        // - gruppo 1, parola intera: 10000
                        // - gruppo 2, inizio parola: 1000
                        // - gruppo 3, numero di caratteri consecutivi nella parola: 200 cad.
                        if (match[1] !== undefined) {
                            weight = 10000;
                        } else if (match[2] !== undefined) {
                            weight = 1000;
                        } else {
                            weight = 200 * match[0].length;
                        }

                        matches.push({
                            "match": match[0],
                            "index": match.index,
                            "weight": weight,
                            "property": prop
                        });
                        totalWeight += weight;
                    }
                });
                return {
                    "index": index,
                    "entry": entry,
                    "matches": matches,
                    "totalWeight": totalWeight
                };
            })
            // // escludo quelli senza match (a 0)
            // .filter(r => r.matches.length)
            // ordino per il peso
            .sort((a, b) => {
                return b.totalWeight - a.totalWeight;
            }),
            r => r.totalWeight > 0);

        console.log(`found ${found.length} entries`);
        console.timeEnd('search');
        return found;
    }    
}