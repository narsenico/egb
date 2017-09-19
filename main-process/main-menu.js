/**
 * Ritorna una funzione per la creazione del menu principale.
 * Per macOS vengono definiti tutti i menu di default.
 * 
 * L'attributo "role" permette ai menu di avere un comportamento predefinito, 
 * senza dover implementare a mano la gestione dell'evento in click.
 * 
 * Opzioni:
 * - debug: default false, se true mostra le voci di menu relative al debug
 * 
 * Eventi:
 * - new-file: richiesta la creazione di una nuova finestra
 *
 * @param      {object}        options  opzioni di creazione, opzionale
 * @return     {EventEmitter}  un event emitter
 * 
 * @see https://github.com/electron/electron/blob/master/docs/api/menu-item.md#roles
 */
const { app, Menu } = require('electron'),
    EventEmitter = require('events');

function getTemplate(eventEmitter) {
    return [{
            label: 'File',
            submenu: [{
                label: 'New',
                click(menuItem, browserWindow, event) {
                    eventEmitter.emit('new-file')
                }
            }]
        },
        {
            label: 'Edit',
            submenu: [{
                    role: 'undo'
                },
                {
                    role: 'redo'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'cut'
                },
                {
                    role: 'copy'
                },
                {
                    role: 'paste'
                },
                {
                    role: 'pasteandmatchstyle'
                },
                {
                    role: 'delete'
                },
                {
                    role: 'selectall'
                }
            ]
        },
        {
            label: 'View',
            submenu: [{
                    role: 'resetzoom'
                },
                {
                    role: 'zoomin'
                },
                {
                    role: 'zoomout'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'togglefullscreen'
                }
            ]
        },
        {
            role: 'window',
            submenu: [{
                    role: 'minimize'
                },
                {
                    role: 'close'
                }
            ]
        }
    ];
}

function createMacOsMenu(template, eventEmitter) {
    const name = app.getName()
    template.unshift({
        label: name,
        submenu: [{
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                role: 'hide'
            },
            {
                role: 'hideothers'
            },
            {
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                role: 'quit'
            }
        ]
    })
    // Edit menu.
    template[2].submenu.push({
        type: 'separator'
    }, {
        label: 'Speech',
        submenu: [{
                role: 'startspeaking'
            },
            {
                role: 'stopspeaking'
            }
        ]
    })
    // Window menu.
    template[4].submenu = [{
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        },
        {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        },
        {
            label: 'Zoom',
            role: 'zoom'
        },
        {
            type: 'separator'
        },
        {
            label: 'Bring All to Front',
            role: 'front'
        }
    ]
}

function createDebugMenu(template, eventEmitter) {
    template.push({
        label: 'Debug',
        submenu: [{
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click(menuItem, browserWindow, event) {
                    if (browserWindow) browserWindow.reload()
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click(menuItem, browserWindow, event) {
                    if (browserWindow) browserWindow.webContents.toggleDevTools()
                }
            }
        ]
    });
}

const defaultOptions = {
    debug: false
}

module.exports = (options) => {
    options = Object.assign({}, defaultOptions, options);

    const emitter = new EventEmitter();

    const template = getTemplate(emitter);
    if (process.platform === 'darwin') {
        // aggiungo i menu di default per macOS
        createMacOsMenu(template, emitter);
    }
    if (options.debug) {
        // aggiungo i menu per il debug
        createDebugMenu(template, emitter);
    }

    // creo il menu dal template
    // per macOS impostato come menu dell'applicazione, 
    // mentre per gli altri verrà impostato come menu per ogni finestra aperta
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return emitter;
}