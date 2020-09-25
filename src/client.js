const net = require('net');
const host = '127.0.0.1';
const port = 12345;

class Client  {
  constructor(mainWindow) {
    this.socket = new net.Socket();
    this.socket.connect(port, host, () => {
      console.log(`Connected to ${host}:${port}.`)
      this.socket.write('Hello, server! Love, Client.');
    });
  
    this.socket.on('data', (data) => {
      mainWindow.webContents.send('ping', data.toString());
    });
  
    this.socket.on('close', () => {
      console.log(`Connection to ${host}:${port} closed.`)
    });
  }
  endConnection() {
    this.socket.end();
  }
}

module.exports = Client;
