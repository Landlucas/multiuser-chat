const net = require('net');
const msgEnd = '\n';

class Client {
  /**
   * Bootstrap the TCP client.
   * @param {Electron.BrowserWindow} window
   */
  constructor(window) {
    this.socket = new net.Socket();
    this.socket.setEncoding('utf8');
    this.users = [];
    this.window = window;
  }

  /**
   * Initiates new connection.
   * @param {string} username
   */
  connect(host, port, username) {
    this.socket.connect(port, host, () => {
      console.log(`Connected to server at ${host}:${port}.`);
      this.socket.write(`/login ${username}\n`);
    });
    this.socket.on('close', () => {
      console.log(`Connection to server at ${host}:${port} closed.`);
    });
  }

  /**
   * Listen for server updates.
   */
  listenForUpdates() {
    this.socket.on('data', (data) => {
      let textBuffer = data.toString().split(msgEnd);
      for (let msg of textBuffer) {
        if (!msg) continue;
        console.log(`Received data: ${msg}`);
        let messageText = '';
        if (msg.startsWith('/username_error ')) {
          messageText = 'Erro de nome de usuário: ' + msg.substring(16);
        }
        if (msg.startsWith('/motd ')) {
          this.window.webContents.executeJavaScript(
            `document.querySelector('.chat-window').innerHTML += '<div class="m-1 font-weight-bolder">${msg.substring(6)}</div>';`
          );
        }
        if (msg.startsWith('/public_msg ')) {
          messageText = msg.substring(12);
        }
        if (msg.startsWith('/user_list ')) {
          this.users = msg.substring(11).split(',');
          this.users.forEach((username) => {
            this.window.webContents.executeJavaScript(
              `document.querySelector('.users-list').innerHTML += '<div class="m-1" data-user="${username}">${username}</div>';`
            );
          });
        }
        if (msg.startsWith('/user_joined ')) {
          let username = msg.substring(13);
          this.window.webContents.executeJavaScript(
            `document.querySelector('.users-list').innerHTML += '<div class="m-1" data-user="${username}">${username}</div>';`
          );
          this.window.webContents.executeJavaScript(
            `document.querySelector('.chat-window').innerHTML += '<div class="m-1 font-italic">${username} entrou no servidor.</div>';`
          );
        }
        if (msg.startsWith('/user_left ')) {
          let username = msg.substring(11);
          this.window.webContents.executeJavaScript(
            `document.querySelector('.users-list div[data-user="${username}"]').remove();`
          );
          this.window.webContents.executeJavaScript(
            `document.querySelector('.chat-window').innerHTML += '<div class="m-1">${username} saiu do servidor.</div>';`
          );
        }
        if (messageText) {
          this.window.webContents.executeJavaScript(
            `document.querySelector('.chat-window').innerHTML += '<div class="m-1">${messageText}</div>';`
          );
        }
      }
    });
  }

  sendMessage(message) {
    this.socket.write(`/public_msg ${message}${msgEnd}`);
  }

  endConnection() {
    this.socket.end();
  }
}

module.exports = Client;
