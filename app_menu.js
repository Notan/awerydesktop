const {app, Menu} = require('electron');
const appIndex = require('./index.js');

const template = [
    {
        label: 'Awery ERP',
        submenu: [
            {
                label: 'About Awery ERP', click: function () {
                    appIndex.showAppVersionInfoDialog();
                }
            },
            {
                label: 'Check for updates', click: function () {
                    appIndex.checkForUpdates();
                }
            },
            {type: 'separator'},
            {role: 'toggledevtools'},
            {type: 'separator'},
            {
                role: 'quit', label: "Quit Awery ERP", click: function () {
                    app.isQuiting = true;
                    app.quit();

                }
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Switch to another ERP system', click: function () {
                    appIndex.switchErpSystem();
                }
            },
            {type: 'separator'},
            {
                label: 'Show Downloads', click: function () {
                    appIndex.showDownloads();
                }
            },
            {type: 'separator'},
            {role: 'reload'},
            {role: 'forcereload'},
            {type: 'separator'},
            {role: 'resetzoom'},
            {role: 'zoomin'},
            {role: 'zoomout'}
        ]
    }, {
        role: 'Window',
        submenu: [
            {role: 'minimize'},
            {role: 'zoom'},
            {
                label: 'Toggle Full Screen', click: () => {
                    appIndex.toggleFullScreen();
                }
            },
            {type: 'separator'},
            {role: 'front'},
            {role: 'hideothers'},
            {role: 'unhide'}
        ]
    }, {
        label: "Edit",
        submenu: [
            {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
            {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
            {type: "separator"},
            {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
            {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
            {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
            {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"},
            {type: "separator"},
            {
                label: 'Print', accelerator: 'CmdOrCtrl+P', click: () => {
                    appIndex.printCurentPage();
                }
            }
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Change log', click() {
                    require('electron').shell.openExternal('http://releasenotes.awery.aero/');
                }
            },
            {type: 'separator'},
            {
                label: 'Documentation portal', click() {
                    require('electron').shell.openExternal('http://help.awery.aero/display/Awery/Awery+Documentation');
                }
            },
            {
                label: 'Awery ERP Support', click() {
                    require('electron').shell.openExternal('https://awery.aero/support');
                }
            },
            {type: 'separator'},
            {
                label: 'Clear cache', click: function () {
                    appIndex.clearCache();
                }
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(template);

exports.setupMenu = function () {
    Menu.setApplicationMenu(menu)
};
