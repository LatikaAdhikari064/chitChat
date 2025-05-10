// Updated client.js with Create/Join Room option
const socket = io();

let room = '';
let name = '';
let photo = '';

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');
const typingStatus = document.getElementById('typing-status');

const createBtn = document.getElementById('create-room-btn');
const joinBtn = document.getElementById('join-room-btn');

// Store created rooms locally for validation (could be moved to server in production)
const existingRooms = new Set();

createBtn.onclick = () => handleRoomAction('create');
joinBtn.onclick = () => handleRoomAction('join');

function handleRoomAction(action) {
  name = document.getElementById('username-input').value.trim();
  room = document.getElementById('room-input').value.trim();
  const photoInput = document.getElementById('photo-input');

  if (!name || !room || !photoInput.files[0]) {
    alert('Please enter name, room, and photo!');
    return;
  }

  if (action === 'create' && existingRooms.has(room)) {
    alert('Room already exists! Please choose a different name or join it.');
    return;
  }

  if (action === 'create') {
    existingRooms.add(room);
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    photo = e.target.result;

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    document.getElementById('room-name').textContent = room;

    socket.emit('register-user', { username: name, photo });
    socket.emit('join-room', { room, name });
  };
  reader.readAsDataURL(photoInput.files[0]);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (content) {
    socket.emit('chat-message', { room, sender: name, content });
    input.value = '';
    addMessage(`You: ${content}`, photo);
  }
});

socket.on('chat-message', (data) => {
  addMessage(`${data.sender}: ${data.content}`, data.photo);
});

socket.on('chat-history', (history) => {
  messages.innerHTML = '';
  history.forEach((msg) => {
    addMessage(`${msg.sender}: ${msg.content}`);
  });
});

socket.on('user-joined', ({ username }) => {
  addMessage(`🎉 ${username} joined the community!`);
});

function addMessage(text, photoURL = null) {
  const div = document.createElement('div');
  if (photoURL) {
    const img = document.createElement('img');
    img.src = photoURL;
    img.alt = 'User Photo';
    img.width = 30;
    img.height = 30;
    img.style.borderRadius = '50%';
    img.style.marginRight = '5px';
    div.appendChild(img);
  }
  const span = document.createElement('span');
  span.textContent = text;
  div.appendChild(span);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

input.addEventListener('input', () => {
  socket.emit('typing', { room, name });
});

socket.on('typing', (data) => {
  typingStatus.textContent = `${data.name} is typing...`;
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    typingStatus.textContent = '';
  }, 1000);
});

/**client  */
document.getElementById('delete-chats-btn').addEventListener('click', () => {
  const confirmDelete = confirm("Are you sure you want to delete all chats?");
  if (confirmDelete) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // clear all messages
    // Optionally emit event to server if you want to notify other users
    // socket.emit('clearMessages');
  }
});
socket.on('clearMessages', () => {
  document.getElementById('messages').innerHTML = '';
});
