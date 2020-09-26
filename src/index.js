const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let Client = require('./client');
let client;
let window;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  if (!process.argv[2]) {
    console.log('The app requires a param with your username. Aborting app.');
    app.quit();
  }

  window = new BrowserWindow({
    width: 1240,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(app.getAppPath(), 'src/preload.js'),
    },
  });

  window.loadFile(path.join(__dirname, 'index.html'));

  window.webContents.openDevTools();

  window.webContents.once('dom-ready', () => {
    client = new Client(window);
    client.connect('127.0.0.1', 12345, process.argv[2]);
    client.socket.on('ready', () => {
      client.listenForUpdates();
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  client.endConnection();
});

ipcMain.on('toMain', (event, args) => {
  console.log(args);
});

ipcMain.on('newMessage', (event, args) => {
  client.sendMessage(args);
});
