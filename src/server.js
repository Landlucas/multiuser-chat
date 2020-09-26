const net = require('net');
const msgEnd = '\n';
const port = 12345;
let sockets = [];

const server = net.createServer((socket) => {
  let loggedIn = false;

  socket.on('data', (data) => {
    if (data.indexOf(msgEnd) >= 0 && data.toString().startsWith('/login ')) {
      let msg = data.toString().split(msgEnd);
      let username = msg[0].substring(7);
      loggedIn = userLoginAttempt(socket, username);
    }
    if (loggedIn) {
      if (data.toString().startsWith('/public_msg ')) {
        sockets.forEach((socketReceiver) => {
          socketReceiver.write(data.toString());
        });
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
  socket.write(`/username_error Username "${username}" already exists.${msgEnd}`);
  socket.end();
};

server.on('error', function (error) {
  console.log('So we got problems!', error.message);
});

server.listen(port, function () {
  console.log(`Server listening at localhost:${port}...`);
});
