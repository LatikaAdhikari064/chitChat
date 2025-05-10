const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' })); // For base64 profile images

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1/students', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  photo: String, // base64 image string
});
const User = mongoose.model('User', userSchema);

// Message schema
const messageSchema = new mongoose.Schema({
  room: String,
  sender: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false },
});
const Message = mongoose.model('Message', messageSchema);

// In-memory connected users
const users = {}; // { username: { id, photo } }

// Socket.IO communication
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Sign Up
  socket.on('signup', async ({ username, password, photo }) => {
    try {
      const existing = await User.findOne({ username });
      if (existing) {
        return socket.emit('auth-fail', 'Username already exists');
      }

      const newUser = new User({ username, password, photo });
      await newUser.save();

      socket.emit('auth-success', { username, photo });
    } catch (err) {
      console.error(err);
      socket.emit('auth-fail', 'Signup failed');
    }
  });

  // Login
  socket.on('login', async ({ username, password }) => {
    try {
      const user = await User.findOne({ username });
      if (!user || user.password !== password) {
        return socket.emit('auth-fail', 'Invalid username or password');
      }

      socket.emit('auth-success', { username, photo: user.photo });
    } catch (err) {
      console.error(err);
      socket.emit('auth-fail', 'Login failed');
    }
  });

  // Register user for chat
  socket.on('register-user', ({ username, photo }) => {
    users[username] = { id: socket.id, photo };
    socket.username = username;
    socket.photo = photo;

    io.emit('users-update', users);
    io.emit('user-joined', { username });
  });

  // Join public room and send chat history
  socket.on('join-room', async ({ room, name }) => {
    socket.join(room);
    const history = await Message.find({ room, isPrivate: false }).sort({ timestamp: 1 });
    socket.emit('chat-history', history);
  });

  // Public message handler
  socket.on('chat-message', async ({ room, sender, content }) => {
    const msg = new Message({ room, sender, content });
    await msg.save();

    const photo = users[sender]?.photo || '';
    io.to(room).emit('chat-message', { sender, content, photo });
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.room).emit('typing', data);
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.username);
    if (socket.username) {
      delete users[socket.username];
      io.emit('users-update', users);
    }
  });
});

//
const bcrypt = require('bcrypt');
// Removed redundant declaration of the User model

app.post('/signup', async (req, res) => {
  const { username, password, photo } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, photo });
  await user.save();

  res.status(201).json({ message: 'User registered successfully' });
});
/*deletion */
socket.on('clearMessages', () => {
  io.emit('clearMessages');
});


// Server listen
server.listen(3110, () => {
  console.log('Server running on http://localhost:3110');
});
