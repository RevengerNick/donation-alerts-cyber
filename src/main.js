const { app, BrowserWindow, ipcMain, globalShortcut} = require('electron');
const GameConnector = require('./game_connector');
const Config = require('./config_manager');
const path = require('path');
const LicenseManager = require('./license_manager'); 

let mainWindow;
let authWindow;
let connector;

function createMainWindow(licenseType, minutesLeft) {
    mainWindow = new BrowserWindow({
        width: 1000, height: 700, minWidth: 950, minHeight: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        autoHideMenuBar: true, backgroundColor: '#0d0d0d', frame: false
    });
    
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    connector = new GameConnector(mainWindow);

    mainWindow.webContents.on('did-finish-load', () => {
        if (licenseType === 'TRIAL') {
            mainWindow.webContents.send('license-status', { type: 'TRIAL', minutes: minutesLeft });
        }
    });
}

function createAuthWindow() {
    authWindow = new BrowserWindow({
        width: 450, height: 400, resizable: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        autoHideMenuBar: true, backgroundColor: '#0d0d0d', frame: false
    });
    authWindow.loadFile(path.join(__dirname, 'auth.html'));
}

app.whenReady().then(async () => {
    const check = await LicenseManager.checkStatus();

    if (check.access) {
        createMainWindow(check.type, check.minutesLeft);
        //registerGlobalHotkeys();
    } else {
        createAuthWindow();
    }
});

function registerGlobalHotkeys() {
    globalShortcut.register('F6', () => {
        if (connector) connector.simulate(70, "Hotkey F6");
    });
    globalShortcut.register('F7', () => {
        if (connector) connector.simulate(228, "Hotkey F7");
    });
    
    globalShortcut.register('F8', () => {
        if (connector) connector.simulate(1000, "Hotkey F8");
    });

    globalShortcut.register('F9', () => {
        if (connector) connector.sendToGame("clean:1");
    });
}

ipcMain.handle('activate-license', async (event, key) => {
    const result = await LicenseManager.activate(key);
    if (result.success) {
        createMainWindow('FULL');
        if (authWindow) authWindow.close();
    }
    return result;
});


ipcMain.on('win-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('win-close', () => {
    app.quit(); 
});

ipcMain.handle('get-config', () => Config.get());
ipcMain.handle('save-config', (e, data) => {
    const success = Config.save(data);
    if(success) connector.reloadConfig();
    return success;
});

ipcMain.on('connect-socket', () => connector.connect());
ipcMain.on('disconnect-socket', () => connector.disconnect());
ipcMain.on('test-logic', (e, data) => connector.simulate(data.amount, data.msg));

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});