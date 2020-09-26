const net = require('net');
const msgTerminator = '\n';

class Client {
  constructor() {
    this.socket = new net.Socket();
    this.socket.setEncoding('utf8');
    this.users = [];
  }

  /**
   * Initiates new connection.
   * @param {string} username
   */
  connect(host, port, username) {
    this.socket.connect(port, host, () => {
      console.log(`Connected to server at ${host}:${port}.`);
      this.socket.write(`LOGIN:${username}\n`);
    });
    this.socket.on('close', () => {
      console.log(`Connection to server at ${host}:${port} closed.`);
    });
  }

  /**
   * Listen for server updates.
   * @param {Electron.BrowserWindow} window
   */
  listenForUpdates(window) {
    this.socket.on('data', (data) => {
      let textBuffer = data.toString().split(msgTerminator);
      for (let msg of textBuffer) {
        if (!msg) continue;
        console.log(`Received data: ${msg}`);
        let messageText = '';
        if (data.toString().startsWith('USERNAME_ERROR:')) {
          messageText = 'Erro de usuário: ' + msg.substring(15);
        }
        if (data.toString().startsWith('MOTD:')) {
          messageText = 'Mensagem do dia: ' + msg.substring(5);
        }
        if (data.toString().startsWith('PUBLICMSG:')) {
          messageText = msg.substring(10);
        }
        if (data.toString().startsWith('USER_LIST:')) {
          this.users = msg.substring(10).split(',');
          this.users.forEach((user) => {
            window.webContents.executeJavaScript(
              `document.querySelector('.users-list').innerHTML += '<div class="m-1">${user}</div>';`
            );
          });
        }
        if (messageText) {
          window.webContents.executeJavaScript(
            `document.querySelector('.chat-window').innerHTML += '<div class="m-1">${messageText}</div>';`
          );
        }
      }
    });
  }

  endConnection() {
    this.socket.end();
  }
}

module.exports = Client;
