const net = require('net');
const msgEnd = '\n';
const port = 12345;
let sockets = [];

const server = net.createServer((socket) => {
  let loggedIn = false;

  socket.on('data', (data) => {
    let textBuffer = data.toString().split(msgEnd);
    for (let msg of textBuffer) {
      if (!msg) continue;
      console.log(`Received message from ${socket.name}: ${msg}`);
      if (msg.startsWith('/login ')) {
        let username = msg.substring(7);
        loggedIn = userLoginAttempt(socket, username);
      }
      if (loggedIn) {
        if (msg.startsWith('/public_msg ')) {
          console.log(`Broadcasting: /public_msg ${socket.name}: ${msg.substring(12)}`);
          sockets.forEach((socketReceiver) => {
            socketReceiver.write(`/public_msg ${socket.name}: ${msg.substring(12)}${msgEnd}`);
          });
        }
        if (msg.startsWith('/w ') ) {
          let splitPrivMessage = msg.substring(3).split(' ');
          let username = splitPrivMessage[0];
          let msgStartIndex = 4 + splitPrivMessage[0].length;
          let socketReceiver = sockets.find((connectedSocket) => connectedSocket.name == username);
          if (socketReceiver) {
            console.log(`Sending private message to ${socket.name}: ${msg.substring(msgStartIndex)}`);
            socketReceiver.write(`/private_msg ${socket.name}: ${msg.substring(msgStartIndex)}${msgEnd}`);
          } else {
            console.log(`User "${username}" does not exist. Unable to send private message.`);
            socket.write(`/warning Usuario "${username}" nao existe.${msgEnd}`);
          }
        }
      }
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

server.on('error', function (error) {
  console.log('So we got problems!', error.message);
});

server.listen(port, function () {
  console.log(`Server listening at localhost:${port}...`);
});
