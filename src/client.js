const net = require('net');

const host = '127.0.0.1';
const port = 12345;

exports.start = (mainWindow) => {
  let client = new net.Socket();
  client.connect(port, host, function () {
    console.log(`Connected to ${host}:${port}.`)
    client.write('Hello, server! Love, Client.');
  });

  client.on('data', function (data) {
    mainWindow.webContents.send('ping', data.toString());
    client.destroy();
  });

  client.on('close', function () {
    console.log(`Connection to ${host}:${port} closed.`)
  });
};
