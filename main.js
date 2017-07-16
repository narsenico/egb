/**
 * E-GB v1.0.0 by narsenico
 */
const electron = require('electron'),
    app = electron.app,
    BrowserWindow = electron.BrowserWindow,
    path = require('path'),
    glob = require('glob'),
    url = require('url'),
    debug = /--debug/.test(process.argv[2]);

// finestra principale
let mainWindow;

function initialize() {
    // richiedo tutti i file .js nella cartella main-process
    glob.sync(path.join(__dirname, 'main-process/**/*.js')).forEach((file) => {
        require(file);
    });

    /**
     * Crea la finestra principale (mainWindow)
     */
    function createWindow() {
        mainWindow = new BrowserWindow({ width: 800, height: 600 });
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));
        // modalità debug: tutto schermo e con dev tool aperto
        if (debug) {
            mainWindow.webContents.openDevTools();
            mainWindow.maximize();
            require('devtron').install();
        }
        // quando chiusa elimino il riferimento
        mainWindow.on('closed', function() {
            mainWindow = null;
        });
    }

    // evento emesso al termine dell'inizializzazione di electron
    app.on('ready', createWindow);

    // evento emesso quando tutte le finestre sono state chiuse
    app.on('window-all-closed', () => {
        // in macOS normalmente l'applicazione viene
        // definitivamente chiusa solo con Cmd + Q
        process.platform !== 'darwin' && app.quit();
    });

    // evento emesso quando l'applicazione viene attivata
    app.on('activate', () => {
        // in macOS se si clicca sull'icona nella dockbar 
        // e non ci sono finestre aperte deve essere ricreata la finestra principale
        mainWindow === null && createWindow();
    });
} // end initialize

initialize();
