const { remote } = require('electron'),
	{ applyToDom } = require('../assets/js/translate.js');

// TODO: intercettare evento 'blur' della finestra per cambiare colore all'header
// 	(vedi Finder dove l'header diventa bianco se perde il focus)
// 	l'evento deve essere intercettato nel main process con .on('blur', ...) e reindirizzato qua con icp

// gestisco i pulsanti azione, cioè quelli con classe btn-action (l'azione è specificata dall'attributo action)
[...document.querySelectorAll('.btn-action')].forEach(btn => {
	btn.addEventListener('click', function(event) {
		event.preventDefault();
		event.stopPropagation();

		// TODO: gestire pulsanti azione
		alert(btn.getAttribute('action'));
	});
});

// applico le traduzioni inziali alla pagina
applyToDom();
// TODO: caricare il contenuto iniziale
document.querySelector('.window-content').innerHTML = 'EGB... your personal encyclopedia';