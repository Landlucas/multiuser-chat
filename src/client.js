const net = require('net');
const fs = require('fs');
const path = require('path');
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
    this.username = '';
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
      if (this.window) {
        this.addNewChatLine(`Conexão com servidor fechada.`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
      }
    });
    this.socket.on('end', () => {
      console.log(`Connection to server at ${host}:${port} ended.`);
      if (this.window) {
        this.addNewChatLine(`Conexão com servidor finalizada.`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
      }
    });
    this.socket.on('error', (error) => {
      console.log(`Socket got problems: ${error.message}`);
      if (this.window) {
        this.addNewChatLine(`Erro: ${error.message}`, ['m-1', 'font-weight-bolder', 'font-italic', 'text-danger']);
      }
    });
  }

  /**
   * Listen for socket stream (server) updates.
   */
  listenForUpdates() {
    let buffer = '';
    let receivingFile = false;
    let fileBuffer = '';
    let fileName = '';
    this.socket.on('data', (data) => {
      buffer += data;
      let msgs = buffer.toString().split(msgEnd);
      for (let msg of msgs) {
        if (!msg) continue;
        console.log(`Received data: ${msg}`);
        if (msg.startsWith('/motd ')) {
          this.addNewChatLine(msg.substring(6), ['m-1', 'font-italic', 'text-info']);
        } else if (msg.startsWith('/user_list ')) {
          this.users = msg.substring(11).split(',');
          this.users.forEach((username) => {
            this.addNewUser(username, ['m-1']);
          });
        } else if (msg.startsWith('/user_joined ')) {
          let username = msg.substring(13);
          this.addNewUser(username, ['m-1']);
          this.addNewChatLine(`${username} entrou no chat.`, ['m-1', 'font-italic']);
        } else if (msg.startsWith('/user_left ')) {
          let username = msg.substring(11);
          this.removeUser(username);
          this.addNewChatLine(`${username} saiu do chat.`, ['m-1', 'font-italic']);
        } else if (msg.startsWith('/public_msg ')) {
          this.addNewChatLine(msg.substring(12), ['m-1']);
        } else if (msg.startsWith('/private_msg ')) {
          this.addNewChatLine(msg.substring(13), ['m-1', 'text-muted']);
        } else if (msg.startsWith('/file_send_start ')) {
          receivingFile = true;
          let splitStartMsg = msg.split(' ');
          fileName = splitStartMsg[1];
        } else if (receivingFile) {
          if (msg.startsWith('/file_send_end')) {
            receivingFile = false;
            this.saveReceivedFile(fileName, fileBuffer);
            fileBuffer = '';
            fileName = '';
          } else {
            fileBuffer += msg;
          }
        } else if (msg.startsWith('/error ')) {
          this.addNewChatLine(`Erro: ${msg.substring(7)}`, ['m-1', 'font-italic', 'text-danger']);
        } else if (msg.startsWith('/warning ')) {
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
   * Send file to socket stream (server).
   * @param {string} filePath
   */
  sendFile(filePath) {
    console.log(`Sending file from ${filePath}`);
    let fileStream = fs.createReadStream(filePath);
    this.socket.write(`/file_send_start ${path.basename(filePath)}${msgEnd}`);
    fileStream.pipe(this.socket, { end: false });
    fileStream.on('end', () => {
      this.socket.write(`${msgEnd}/file_send_end${msgEnd}`);
    });
  }

  /**
   * Save received file.
   * @param {string} fileName
   * @param {string} fileData
   */
  saveReceivedFile(fileName, fileData) {
    let filePathDir = path.resolve(__dirname, '..', 'temp', this.username);
    if (!fs.existsSync(filePathDir)) {
      fs.mkdirSync(filePathDir, { recursive: true });
    }
    let filePath = path.resolve(__dirname, '..', 'temp', this.username, fileName);
    console.log(`Saving file at ${filePath}`);
    fs.appendFile(filePath, fileData, (err) => {
      if (err) throw err;
    });
  }

  /**
   * Concat new line in chat window.
   * @param {string} line
   * @param {string[]} classes
   */
  addNewChatLine(line, classes) {
    try {
      if (this.window) {
        this.window.webContents.executeJavaScript(
          `document.querySelector('.chat-window').innerHTML += '<div class="${classes.join(' ')}">${line}</div>';`
        );
      }
    } catch (err) {}
  }

  /**
   * Concat new username in user window.
   * @param {string} username
   * @param {string[]} classes
   */
  addNewUser(username, classes) {
    try {
      if (this.window) {
        this.window.webContents.executeJavaScript(
          `document.querySelector('.users-list').innerHTML += '<div class="${classes.join(
            ' '
          )}" data-user="${username}">${username}</div>';`
        );
      }
    } catch (err) {}
  }

  /**
   * Remove username from user window.
   * @param {string} username
   */
  removeUser(username) {
    try {
      if (this.window) {
        this.window.webContents.executeJavaScript(
          `document.querySelector('.users-list div[data-user="${username}"]').remove();`
        );
      }
    } catch (err) {}
  }

  endConnection() {
    this.socket.end();
  }
}

module.exports = Client;
