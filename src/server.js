const net = require('net');

const host = '127.0.0.1';
const port = 12345;

net
  .createServer(function (socket) {
    socket.on('data', function (data) {
      console.log(`Received message: ${data.toString()}`);
      socket.write(data.toString());
    });
  })
  .listen(port, host);

console.log(`Listening on ${host}:${port}...`);
