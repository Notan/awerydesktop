const electron = require('electron');
const {app, Tray, Menu, dialog, ipcMain, shell} = require('electron');
const path = require('path');
const appMenu = require('./app_menu.js');
const userDataPath = (electron.app || electron.remote.app).getPath('userData');
let {autoUpdater} = require("electron-updater");
let fs = require('fs');

app.commandLine.appendSwitch('--allow-file-access-from-files');
app.commandLine.appendSwitch('--enable-print-preview');

/********** autoUpdater **********/
autoUpdater.on('checking-for-update', () => {
    setStatusToWindow('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
    setStatusToWindow('Update available.');
});
autoUpdater.on('update-not-available', (info) => {
    setStatusToWindow('Update not available.');
});
autoUpdater.on('error', (err) => {
    setStatusToWindow('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = `Downloaded: ${progressObj.percent.toFixed(0)} % - speed: ${progressObj.bytesPerSecond}`;
    setStatusToWindow(log_message);
});
autoUpdater.on('update-downloaded', (ev, info) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        icon: nativeImage.createFromPath(path.join(__dirname, '/res/images/win32/ic_launcher.ico')),
        message: 'A new version has been downloaded. Restart the application to apply the updates.'
    };
    dialog.showMessageBox(dialogOpts, (response) => {
        if (response === 0) autoUpdater.quitAndInstall();
    })
});

app.on('window-all-closed', () => {
    app.quit();
});

const setStatusToWindow = (text) => {
    mainWindow.webContents.send('upd-message', text);
};
/********** autoUpdater **********/

const nativeImage = electron.nativeImage;
let isFullScreen = false;

let browserWindow = electron.BrowserWindow;
let mainWindow;

let trayIcon = nativeImage.createFromPath(path.join(__dirname, '/res/images/osx/ic_tray.png'));
let updateWindowOpened = false;

let pluginName;
switch (process.platform) {
    case 'win32':
        pluginName = 'pepflashplayer.dll';
        trayIcon = nativeImage.createFromPath(path.join(__dirname, '\\res\\images\\win32\\ic_launcher.ico'));
        app.commandLine.appendSwitch('ppapi-flash-path', path.join((__dirname.includes(".asar") ? process.resourcesPath : __dirname) + '\\res\\plugins\\' + pluginName));
        break;
    case 'darwin':
        pluginName = 'PepperFlashPlayer.plugin';
        trayIcon = nativeImage.createFromPath(path.join(__dirname, '/res/images/osx/ic_tray.png'));
        app.commandLine.appendSwitch('ppapi-flash-path', path.join((__dirname.includes(".asar") ? process.resourcesPath : __dirname), 'res', 'plugins', pluginName));
        break;
    case 'linux':
        pluginName = 'libpepflashplayer.so';
        break;
}
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.156');

app.on('ready', function () {
    // for private repo
    autoUpdater.setFeedURL({
        private: true,
        provider: 'github',
        owner: 'notan',
        repo: 'awerydesktop',
        token: 'a89ec6a54d676490c20abd1b078952b0cbdf0f03'
    });
    createWindow();
    appMenu.setupMenu();
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true)
});
app.commandLine.appendSwitch('allow-insecure-localhost');

app.on('activate', function () {
    /*
    На macOS приложение обычно пересоздаёт окно, когда
    пользователь кликает на его иконку в доке, если не открыто
    других окон.
    */
    if (mainWindow === null) {
        createWindow();
    }
    autoUpdater.checkForUpdates();
});

app.on('window-all-closed', function () {
    app.quit()
});

function createWindow() {
    mainWindow = new browserWindow({
        width: 1366,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        allowRunningInsecureContent: true,
        unsafeEval: true,
        show: false,
        autoHideMenuBar: true,
        maximizable: true,
        fullscreen: false,
        titleBarAppearsTransparent: true,
        titleBarStyle: 'hiddenInset',
        icon: trayIcon,
        backgroundColor: "#FFFFFF",
        webPreferences: {
            plugins: true,
            webviewTag: true,
            webSecurity: false,
            nodeIntegration: true
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    console.log(require.resolve('electron'));

    mainWindow.setFullScreenable(true);
    mainWindow.setMaximizable(true);

    mainWindow.loadURL(`file://${__dirname}/index.html`);

    const page = mainWindow.webContents;

    page.on('new-window', (event, url, frameName, disposition, options) => {
        options.webPreferences.plugins = true
    });

    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        // Set the save path, making Electron not to prompt a save dialog.
        console.log('EVENT "will-download"', item.getSavePath());

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed')
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused')
                } else {
                    console.log(`Received bytes: ${item.getReceivedBytes()}`)
                }
            }
        });
        item.once('done', (event, state) => {
            if (state === 'completed') {
                const currentDatetime = new Date();
                const formattedDate = currentDatetime.toISOString()
                    .replace(/T/, ' ')     // replace T with a space
                    .replace(/\..+/, '');

                let fileName = item.getSavePath().split('/');
                fileName = fileName[fileName.length - 1];

                mainWindow.webContents.send('addNewDownload', {
                    filename: fileName,
                    path: item.getSavePath(),
                    size: Math.round(item.getTotalBytes() / 1024),
                    date: formattedDate
                });
            } else {
                console.log(`Download failed: ${state}`)
            }
        })
    });

    setTimeout(() => {
        mainWindow.webContents.send('auto-login', true);
    }, 1000) ;

//======================================================================================================================
// TRAY
//======================================================================================================================
    let iconpath;
    if (process.platform == 'darwin') {
        iconpath = path.join(__dirname, '/res/images/osx/ic_tray.png');
    } else if (process.platform == 'win32') {
        iconpath = path.join(__dirname, '/res/images/win32/ic_tray.ico');
    }
    const tray = new Tray(iconpath);
    if (process.platform == 'darwin') {
        tray.setPressedImage(nativeImage.createFromPath(path.join(__dirname, '/res/images/osx/ic_tray_highlight.png')));
    }

    let contextMenu = Menu.buildFromTemplate([{
        label: 'Show App', click: function () {
            mainWindow.show();
        }
    }, {
        label: 'Quit', click: function () {
            app.isQuiting = true;
            app.quit();
        }
    }]);
    tray.setContextMenu(contextMenu);
    mainWindow.on('close', function (event) {
        mainWindow = null
    });


    mainWindow.on('minimize', function (event) {
        if (process.platform == 'darwin') {
            event.preventDefault();
            mainWindow.hide();
        }
    });
    mainWindow.on('show', function () {
        tray.setHighlightMode('selection')
    });
    mainWindow.on('leave-full-screen', function () {
        if (process.platform === 'darwin') {
            mainWindow.webContents.send('toggle-min-max-screen', false);
        }
    });
    mainWindow.on('enter-full-screen', function () {
        if (process.platform === 'darwin') {
            mainWindow.webContents.send('toggle-min-max-screen', true);
        }
    });


    //  ipcMain
    let ERP_LINK = '';
    let ERP_AUTH_TOKEN = '';
    let ERP_NAME = '';
    let FLEX_REPORT_URL = '';
    let FLEX_REPORT_SERIAL = '';
    exports.erpToken = ERP_AUTH_TOKEN;


    ipcMain.on('open-file', function (event, path, id) {
        fs.stat(path, function (err, stat) {
            if (err == null) {
                shell.openItem(path);
            } else if (err.code == 'ENOENT') {
                event.sender.send('file-does-not-exist', id, true);
            }
        });
    });

    ipcMain.on('check-file', function (event, path, id) {
        fs.stat(path, function (err, stat) {
            if (err !== null && err.code == 'ENOENT') {
                event.sender.send('file-does-not-exist', id, false);
            }
        });
    });


    ipcMain.on('flex-report-container', function (event, url, serial) {
        FLEX_REPORT_URL = url;
        FLEX_REPORT_SERIAL = serial;
    });

    ipcMain.on('load-local-cdn-version', function (event, args) {
        const acmVersionDescriptor = path.join(userDataPath, '/acm', '/version.as');

        fs.readFile(acmVersionDescriptor, 'utf8', function (err, data) {
            let version = 0;
            if (err) {
                event.sender.send('set-version-as', version);
                return console.log(err);
            }

            version = data.match(/\"([0-9\.]*)\"/);
            version = version.length > 1 ? parseFloat(version[1]) : 0;
            event.sender.send('set-version-as', version);
        });

    });

    ipcMain.on('on-flex-report-loader-ready', function (event, args) {
        event.sender.send('load-flex-report', FLEX_REPORT_URL, FLEX_REPORT_SERIAL);
    });

    ipcMain.on('update-local-version', function (event) {
        console.info('Need to update!');
        startAcmUpdate();
    })

    ipcMain.on('erp-system-chosen', function (event, erpLink, authToken, erpName, isDesktopAcmMode) {
        console.log('IPC_EVENT: erp-system-chosen \n\tAuthorisation to ERP:', erpLink, '\n\twith token:', authToken, '\n\tisDesktopAcmMode: ', isDesktopAcmMode);
        ERP_LINK = erpLink;
        ERP_NAME = erpName;
        module.exports.erpToken = authToken;

        let isDesktopMode = isDesktopAcmMode ? true : "";

        mainWindow.loadURL('data:text/html,' +
            '<script>' +
            'let mToken = "' + authToken + '";' +
            'let kostil = "' + isDesktopMode + '";' +
            '   localStorage.setItem("token", mToken);' +
            '   localStorage.setItem("isRunInDesktopApp", "true");' +
            '   localStorage.setItem("DESKTOPACMMODE",  kostil);' +
            '</script>', {
            baseURLForDataURL: ERP_LINK,
        });


        //Open 'erp_screen' with 2 sec delay
        setTimeout(function () {
            mainWindow.loadURL(`file://${__dirname}/src/html/erp_screen.html`);
        }, 2000);
    });


    ipcMain.on('erp-page-ready', (event, args) => {
        console.log('ipcMain EVENT erp-page-ready');
        event.sender.send('init-erp-system', ERP_LINK, ERP_AUTH_TOKEN, ERP_NAME);

        if (process.platform === 'darwin') {
            mainWindow.webContents.send('toggle-min-max-screen', isFullScreen);
        }
    });

    ipcMain.on('erp-toggle-ext-menu', (event, arg) => {
        // openExtMenu();
    });

    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 10 * 60 * 1000/*10 minutes*/);

    ipcMain.on('update-closed', (event) => {
        updateWindowOpened = false;
        mainWindow.webContents.send('update-complete');
    });
}

function startAcmUpdate() {
    if (updateWindowOpened)
        return false;

    updateWindowOpened = true;
    let updWin = new browserWindow({
        width: 400,
        height: 200,
        fullscreen: false,
        fullscreenable: false,
        titleBarAppearsTransparent: true,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: true
        }
    });
    updWin.on('closed', () => {
        updWin = null
    });
    updWin.loadURL(`file://${__dirname}/src/html/acm_update.html`);
}

//======================================================================================================================
//  E X P O R T S
//======================================================================================================================
exports.printCurentPage = function switchErpSystem() {
    mainWindow.webContents.send('request-to-print-current-page', '');
};
exports.switchErpSystem = function switchErpSystem() {
    mainWindow.loadURL(`file://${__dirname}/index.html`);
};
exports.showDownloads = function showDownloads() {
    mainWindow.webContents.send('request-to-display-downloads', '');
};

exports.showAppVersionInfoDialog = function showAppVersionInfoDialog() {
    let updWin = new browserWindow({
        width: 420, height: 300,
        fullscreenable: false,
        fullscreen: false,
        resizable: true,
        webPreferences: {
            plugins: true,
            nodeIntegration: true,
        }
    });
    updWin.loadURL(`file://${__dirname}/src/html/dialog_app_version_info.html`);
};

exports.checkForUpdates = function checkForUpdates() {
    autoUpdater.checkForUpdates();
};

exports.clearCache = function clearCache() {
    mainWindow.webContents.session.clearCache(function () {
        //TODO: implement callback
    });
};

exports.toggleFullScreen = function toggleFullScreen() {
    isFullScreen = !isFullScreen;
    mainWindow.setFullScreen(isFullScreen);
    if (process.platform === 'darwin') {
        mainWindow.webContents.send('toggle-min-max-screen', isFullScreen);
    }
};

// "darwin" packaging
// electron-packager . "Awery ERP" --platform=darwin --arch=x64 --overwrite --app-version='0.7.4' --build-version='54' --osx-sign.identity="Developer ID Application: Awery FZE (WL9ZP5DB23)" --icon="./res/images/osx/ic_launcher.icns" --app-bundle-id="com.awery.awerydesktop"
// electron-installer-dmg "./Awery ERP-darwin-x64/Awery ERP.app" "Awery ERP installer" --icon="./res/images/osx/ic_installer.icns" --background="./res/images/osx/install.png" --overwrite  --icon-size=120 <-WORK

// electron-osx-sign "./Awery ERP-darwin-x64/Awery ERP.app"
// build --win --ia32
// build --win --x64 <- THIS
// electron-windows-store --input-directory "./dist/win-unpacked" --output-directory "./dist/store" --flatten true --package-version 0.4.1 --package-name com.awery.erp.desktop