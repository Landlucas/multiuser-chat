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
    this.username = username;
    this.socket.connect(port, host, () => {
      console.log(`Connected to server at ${host}:${port}.`);
      this.socket.write(`/login ${username}\n`);
    });
    this.socket.on('close', () => {
      console.log(`Connection to server at ${host}:${port} closed.`);
      this.addNewChatLine(`Conexão com servidor fechada.`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
    });
    this.socket.on('end', () => {
      console.log(`Connection to server at ${host}:${port} ended.`);
      this.addNewChatLine(`Conexão com servidor finalizada.`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
    });
    this.socket.on('error', (error) => {
      console.log(`Socket got problems: ${error.message}`);
      this.addNewChatLine(`Erro: ${error.message}`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
    });
  }

  /**
   * Listen for socket stream (server) updates.
   */
  listenForUpdates() {
    let buffer = '';
    this.socket.on('data', (data) => {
      buffer += data;
      let msgs = buffer.toString().split(msgEnd);
      for (let msg of msgs) {
        if (!msg) continue;
        console.log(`Received data: ${msg}`);
        if (msg.startsWith('/motd ')) {
          this.addNewChatLine(msg.substring(6), ['m-1', 'font-italic', 'text-info']);
        }
        if (msg.startsWith('/user_list ')) {
          this.users = msg.substring(11).split(',');
          this.users.forEach((username) => {
            this.addNewUser(username, ['m-1']);
          });
        }
        if (msg.startsWith('/user_joined ')) {
          let username = msg.substring(13);
          this.addNewUser(username, ['m-1']);
          this.addNewChatLine(`${username} entrou no chat.`, ['m-1', 'font-italic']);
        }
        if (msg.startsWith('/user_left ')) {
          let username = msg.substring(11);
          this.removeUser(username);
          this.addNewChatLine(`${username} saiu do chat.`, ['m-1', 'font-italic']);
        }
        if (msg.startsWith('/public_msg ')) {
          this.addNewChatLine(msg.substring(12), ['m-1']);
        }
        if (msg.startsWith('/private_msg ')) {
          this.addNewChatLine(msg.substring(13), ['m-1', 'text-muted']);
        }
        if (msg.startsWith('/error ')) {
          this.addNewChatLine(`Erro: ${msg.substring(7)}`, ['m-1', 'font-italic', 'text-danger']);
        }
        if (msg.startsWith('/warning ')) {
          this.addNewChatLine(`${msg.substring(9)}`, ['m-1', 'font-italic', 'text-warning']);
        }
        buffer = msgs[msgs.length - 1];
      }
    });
  }

  /**
   * Send message to socket stream (server).
   * @param {string} msg
   */
  sendMessage(msg) {
    if (msg.startsWith('/w ')) {
      this.socket.write(`${msg}${msgEnd}`);
      let splitPrivMessage = msg.substring(3).split(' ');
      let username = splitPrivMessage[0];
      let msgStartIndex = 4 + splitPrivMessage[0].length;
      this.addNewChatLine(`para ${username}: ${msg.substring(msgStartIndex)}`, ['m-1', 'text-muted']);
    } else {
      this.socket.write(`/public_msg ${msg}${msgEnd}`);
      this.addNewChatLine(`${this.username}: ${msg}`, ['m-1']);
    }
  }

  /**
   * Concat new line in chat window.
   * @param {string} line
   * @param {string[]} classes
   */
  addNewChatLine(line, classes) {
    if (this.window) {
      this.window.webContents.executeJavaScript(
        `document.querySelector('.chat-window').innerHTML += '<div class="${classes.join(' ')}">${line}</div>';`
      );
    }
  }

  /**
   * Concat new username in user window.
   * @param {string} username
   * @param {string[]} classes
   */
  addNewUser(username, classes) {
    if (this.window) {
      this.window.webContents.executeJavaScript(
        `document.querySelector('.users-list').innerHTML += '<div class="${classes.join(
          ' '
        )}" data-user="${username}">${username}</div>';`
      );
    }
  }

  /**
   * Remove username from user window.
   * @param {string} username
   */
  removeUser(username) {
    if (this.window) {
      this.window.webContents.executeJavaScript(
        `document.querySelector('.users-list div[data-user="${username}"]').remove();`
      );
    }
  }

  endConnection() {
    this.socket.end();
  }
}

module.exports = Client;
