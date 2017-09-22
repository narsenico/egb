const { remote } = require('electron'),
	db = remote.require('./main-process/db.js'),
	U = require('../assets/js/utils');

const windowContent = document.querySelector('.window-content');
const searchInput = document.querySelector('input[type="search"]');
searchInput.addEventListener('change', function() {
	if (!U.isEmpty(this.value)) {
	db.search(this.value)
		.then(data => {
			console.log(data);
		})
		.catch(err => {
			console.error(err);
			alert('Error: search');
		})		
	} else {
		console.log('EMPTY');
	}
});