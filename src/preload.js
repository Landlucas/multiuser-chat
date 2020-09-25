const { ipcRenderer } = require('electron');

ipcRenderer.on('ping', (event, message) => {
  console.log(message);
});
