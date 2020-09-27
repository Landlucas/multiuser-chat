const net = require('net');
const msgEnd = '\n';
const port = 12345;
let sockets = [];

const server = net.createServer((socket) => {
  let loggedIn = false;
  let buffer = '';
  let receivingFile = false;
  let fileBuffer = '';
  let fileName = '';

  socket.on('data', (data) => {
    buffer = data;
    let msgs = buffer.toString().split(msgEnd);
    for (let msg of msgs) {
      if (!msg) continue;
      console.log(`Received data from ${socket.name}`);
      if (msg.startsWith('/login ')) {
        let username = msg.substring(7);
        loggedIn = userLoginAttempt(socket, username);
      }
      if (loggedIn) {
        if (msg.startsWith('/public_msg ')) {
          publicMsg(socket, msg);
          if (receivingFile) {
            fileError(socket);
          }
        }
        else if (msg.startsWith('/w ') ) {
          privateMsg(socket, msg);
          if (receivingFile) {
            fileError(socket);
          }
        }
        else if (msg.startsWith('/file_send_start') ) {
          receivingFile = true;
          let splitStartMsg = msg.split(' ');
          fileName = splitStartMsg[1];
        }
        else if (receivingFile) {
          if (msg.startsWith('/file_send_end') ) {
            receivingFile = false;
            sendFile(socket, fileName, fileBuffer);
            fileBuffer = '';
            fileName = '';
          } else {
            fileBuffer += msg;
          }
        }
      }
      buffer = msgs[msgs.length - 1];
    }
  });

  socket.on('end', () => {
    console.log(`${socket.name} disconnected from the server.`);
    if (loggedIn) {
      sockets.splice(sockets.indexOf(socket), 1);
      sockets.forEach((socketReceiver) => {
        socketReceiver.write(`/user_left ${socket.name}${msgEnd}`);
      });
    }
  });

  socket.on('error', (error) => {
    console.log(`Socket got problems: ${error.message}`);
    if (loggedIn) {
      sockets.splice(sockets.indexOf(socket), 1);
    }
  });
});

/**
 * Handles user login attempt.
 * @param {net.Socket} socket
 * @param {string} username
 */
const userLoginAttempt = (socket, username) => {
  if (sockets.find((connectedSocket) => connectedSocket.name == username)) {
    existingUser(socket, username);
    return false;
  } else {
    newUser(socket, username);
    return true;
  }
};

/**
 * Adds new user.
 * @param {net.Socket} socket
 * @param {string} username
 */
const newUser = (socket, username) => {
  sockets.push(socket);
  socket.name = username;
  console.log(`${socket.name} has joined the server.`);
  socket.write(`/motd Bem vindo ao Multiuser Chat, ${socket.name}!${msgEnd}`);
  socket.write(`/user_list ${sockets.map((e) => e.name).join(',')}${msgEnd}`);
  sockets.forEach((socketReceiver) => {
    if (socket != socketReceiver) {
      socketReceiver.write(`/user_joined ${username}${msgEnd}`);
    }
  });
};

/**
 * Revokes user login because of exisiting username.
 * @param {net.Socket} socket
 * @param {string} username
 */
const existingUser = (socket, username) => {
  socket.name = socket.remoteAddress + ':' + socket.remotePort;
  console.log(`${username}(${socket.name}) tried to connect but username already exists.`);
  socket.write(`/error Usuário "${username}" já existe.${msgEnd}`);
  socket.end();
};

/**
 * Handles public messages.
 * @param {net.Socket} socket 
 * @param {string} msg 
 */
const publicMsg = (socket, msg) => {
  console.log(`Broadcasting: /public_msg ${socket.name}: ${msg.substring(12)}`);
  for (socketReceiver of sockets) {
    if (socket.name == socketReceiver.name) continue;
    socketReceiver.write(`/public_msg ${socket.name}: ${msg.substring(12)}${msgEnd}`);
  }
}

/**
 * Handles private messages.
 * @param {net.Socket} socket 
 * @param {string} msg 
 */
const privateMsg = (socket, msg) => {
  let splitPrivMessage = msg.substring(3).split(' ');
  let username = splitPrivMessage[0];
  let msgStartIndex = 4 + splitPrivMessage[0].length;
  let socketReceiver = sockets.find((connectedSocket) => connectedSocket.name == username);
  if (socketReceiver) {
    console.log(`Sending private message to ${socket.name}: ${msg.substring(msgStartIndex)}`);
    socketReceiver.write(`/private_msg de ${socket.name}: ${msg.substring(msgStartIndex)}${msgEnd}`);
  } else {
    console.log(`User "${username}" does not exist. Unable to send private message.`);
    socket.write(`/warning Usuario "${username}" nao existe.${msgEnd}`);
  }
}

/**
 * Handles file sending.
 * @param {net.Socket} socket 
 * @param {string} fileName 
 * @param {string} data 
 */
const sendFile = (socket, fileName, data) => {
  console.log(`Broadcasting file received from ${socket.name}: ${data}`);
  for (socketReceiver of sockets) {
    if (socket.name == socketReceiver.name) continue;
    socketReceiver.write(`/file_send_start ${fileName}${msgEnd}${data}${msgEnd}/file_send_end${msgEnd}`);
  }
}

/**
 * Handles file send error.
 * @param {net.Socket} socket 
 */
const fileError = (socket) => {
  console.log(`Error receiving file from ${socket.name}`);
  socket.name.write(`/error Houve um problema no envio do arquivo.${msgEnd}`);
}

server.on('error', function (error) {
  console.log('So we got problems!', error.message);
});

server.listen(port, function () {
  console.log(`Server listening at localhost:${port}...`);
});
