/**
 * E-GB v1.0.0 by narsenico
 */
const { app, BrowserWindow, Menu } = require('electron'),
    path = require('path'),
    db = require('./db.js'),
    debug = /--debug/.test(process.argv[2]);

/**
 * Crea una finestra e carica la pagina iniziale.
 *
 * @return     {int}  id della finestra
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        minWidth: 680,
        height: 600,
        title: app.getName()
    });
    win.loadURL(path.join('file://', __dirname, '..', '/assets/index.html'));

    // // quando chiusa elimino il riferimento
    // win.on('closed', function() {
    //     win = null;
    // });

    return win.id;
}

// evento emesso al termine dell'inizializzazione di electron
app.on('ready', () => {
    // creo il menu principale e gestisco gli eventi
    require('./main-menu.js')({ 'debug': debug })
        .on('new-file', createWindow);

    // inizializzo il db, solo al termine creo la prima finestra
    db.init().then(() => {
        createWindow();
    });
});

// evento emesso quando tutte le finestre sono state chiuse
app.on('window-all-closed', () => {
    // in macOS normalmente l'applicazione viene
    // definitivamente chiusa solo con Cmd + Q
    process.platform !== 'darwin' && app.quit();
});

// evento emesso quando l'applicazione viene attivata
app.on('activate', () => {
    // in macOS se si clicca sull'icona nella dockbar 
    // e non ci sono finestre aperte deve essere creata una  finestra
    BrowserWindow.getAllWindows().length === 0 && createWindow();
});