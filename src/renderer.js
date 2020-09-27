let sendButton;
let fileButton;
let messageInput;

window.onload = () => {
  sendButton = document.querySelector('.send-message-button');
  fileButton = document.querySelector('.send-file-button');
  messageInput = document.querySelector('.message-input');
  messageInput.value = '';
  sendButton.addEventListener('click', () => {
    sendMessage(messageInput.value);
    messageInput.value = '';
  });
  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      sendMessage(messageInput.value);
      messageInput.value = '';
      messageInput.blur();
    }
  });
  fileButton.addEventListener('click', () => {
    window.api.send('openDialog', '');
  });
}

const sendMessage = (message) => {
  if (message.length > 0) {
    window.api.send('newMessage', message);
  }
}

window.api.receive('toRenderer', (data) => {
  console.log(`${data}`);
});
