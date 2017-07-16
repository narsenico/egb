const app = require('electron').app,
	ipc = require('electron').ipcMain;

ipc.on('get-user-home', (event) => {
	event.sender.send('got-user-home', app.getPath('home'));
});
ipc.on('get-user-data', (event) => {
	event.sender.send('got-user-data', app.getPath('userData'));
});