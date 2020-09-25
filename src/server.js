var net = require('net');
var sockets = [];
var port = 12345;

var server = net.createServer(function (socket) {
  socket.name = socket.remoteAddress + ':' + socket.remotePort;

  sockets.push(socket);

  // Log it to the server output
  console.log(socket.name + ' has joined the server.');

  socket.write('Welcome to multiuser chat!\n');

  // When client leaves
  socket.on('end', function () {
    console.log(socket.name + ' left the server.\n');

    // Remove client from socket array
    sockets.splice(sockets.indexOf(socket), 1);
  });

  // When socket gets errors
  socket.on('error', function (error) {
    console.log('Socket got problems: ', error.message);
  });

  socket.on('data', function (data) {
    // If there are clients remaining then broadcast message
    sockets.forEach(function (socketReceiver, index, array) {
      socketReceiver.write(`${socket.name}: ${data.toString()}`);
    });
  });
});

// Listening for any problems with the server
server.on('error', function (error) {
  console.log('So we got problems!', error.message);
});

// Listen for a port to telnet to
// then in the terminal just run 'telnet localhost [port]'
server.listen(port, function () {
  console.log(`Server listening at localhost: + ${port}...`);
});
