const net = require('net');
const msgTerminator = '\n';
let sockets = [];
let port = 12345;

let server = net.createServer(function (socket) {
  let loggedIn = false;
  socket.on('data', function (data) {
    if (data.indexOf(msgTerminator) >= 0 && data.toString().startsWith('LOGIN:')) {
      let msg = data.toString().split(msgTerminator);
      let username = msg[0].substring(6);
      if (sockets.find((connectedSocket) => connectedSocket.name == username)) {
        socket.name = socket.remoteAddress + ':' + socket.remotePort;
        console.log(`${username}(${socket.name}) tried to connect but username already exists.`);
        socket.write(`USERNAME_ERROR:Username "${username}" already exists.\n`);
        socket.end();
      } else {
        sockets.push(socket);
        socket.name = username;
        console.log(`${socket.name} has joined the server.`);
        socket.write(`MOTD:Welcome to Multiuser Chat!\n`);
        loggedIn = true;
        console.log('User list: ' + sockets.map((e) => e.name).join(','));
        socket.write(`USER_LIST:${sockets.map((e) => e.name).join(',')}\n`);
      }
    }
  });

  socket.on('end', function () {
    console.log(socket.name + ' disconnected from the server.\n');
    if (loggedIn) {
      sockets.splice(sockets.indexOf(socket), 1);
    }
  });

  socket.on('error', function (error) {
    console.log('Socket got problems: ', error.message);
    if (loggedIn) {
      sockets.splice(sockets.indexOf(socket), 1);
    }
  });

  socket.on('data', function (data) {
    if (loggedIn) {
      if (data.toString().startsWith('PUBLICMSG:')) {
        sockets.forEach(function (socketReceiver, index, array) {
          socketReceiver.write(data.toString());
        });
      }
    }
  });
});

server.on('error', function (error) {
  console.log('So we got problems!', error.message);
});

server.listen(port, function () {
  console.log(`Server listening at localhost:${port}...`);
});
