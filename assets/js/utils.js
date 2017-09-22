const rgEmptyString = /^\s*$/;

/**
 * In base al tipo di selector ritorna:
 * - Element: un array che ha come unico elemento selector
 * - NodeList: selector
 * - HTMLDocument: ritonra un array che ha come unico elemento body
 * - string: ritorna il risultato di document.querySelectorAll(selector)
 * - altrimenti: un array vuoto
 *
 * @param      {any}  selector  può essere una stringa, un Element o un NodeList
 * @return     {Array}   un array
 */
function parseSelector(selector) {
    if (!selector) {
        return [];
    } else if (selector instanceof HTMLDocument) {
        return selector.querySelectorAll('body');
    } else if (selector instanceof Element) {
        return [selector];
    } else if (selector instanceof NodeList) {
        return selector;
    } else if (typeof selector == 'string') {
        return document.querySelectorAll(selector);
    // } else if ($ && selector.jquery) {
    //     return selector.get();
    } else {
        return [];
    }
}

function isEmpty(text) {
    return text === null || text === undefined || 
        rgEmptyString.test(text);
}

module.exports = {
    parseSelector,
    isEmpty
}