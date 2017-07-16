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

module.exports = {
    "byWeight": function(entries, query) {
        console.time('search');

        // separo le singole parole esludendo quelle con pochi caratteri
        const tokens = query.split(sep).filter(t => t.length > 1);
        // creo la regexp con flag i (ignore case) 
        //  e g (con il quale posso loopare per tutti i match nella stringa)
        const re = new RegExp(tokens.join('|'), 'ig');
        console.log(re);

        const found = entries
            // ritorna un array con tutti i match
            .map((entry, index) => {
                const matches = [];
                let totalWeight = 0;
                let match, weight, wstart, wlen;
                // il loop funziona solo con il flag g
                // per ora considero solo la proprietà name
                while ((match = re.exec(entry.name)) !== null) {
                    // calcolo il peso del match:
                    // - parola intera: 10000
                    // - inizio parola: 1000
                    // - numero di caratteri consecutivi nella parola: 200 ca
                    [wstart, wlen] = getWordBounds(entry.name, match.index);
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
                        "weight": weight
                    });
                    totalWeight += weight;
                }
                return {
                    "index": index,
                    "matches": matches,
                    "totalWeight": totalWeight
                };
            })
            // escludo quelli senza match (a 0)
            .filter(r => r.matches.length)
            // ordino per il peso
            .sort((a, b) => {
                return b.totalWeight - a.totalWeight;
            });
        // .forEach(r => {
        //     console.log(`${JSON.stringify(entries[r.index])} =>\n${JSON.stringify(r)}\n`);
        // });

        console.timeEnd('search');
        return found;
    }
}
