import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const initSocket = (server) => {
  const io = new Server(server, {
    pingTimeout: 60000, // Close connection if inactive for 60s
    cors: {
      origin: '*', // For development. We can narrow this down in production.
      methods: ['GET', 'POST'],
    },
  });

  // Socket.IO Authentication Middleware (JWT)
  io.use(async (socket, next) => {
    try {
      // Token can be sent in handshake.auth or authorization headers
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers['authorization'];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Handle "Bearer <token>" format
      const actualToken = token.startsWith('Bearer ')
        ? token.split(' ')[1]
        : token;

      // Decode and verify
      const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
      
      // Fetch user and attach to socket
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connection
  io.on('connection', (socket) => {
    console.log(`Connected to socket.io: User ${socket.user.username} (${socket.user._id})`);

    // Setup event: client joins their personal room
    socket.on('setup', async () => {
      socket.join(socket.user._id.toString());
      
      // Mark user as online in DB
      try {
        await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
        // Broadcast to everyone that this user is online
        socket.broadcast.emit('user online', socket.user._id);
      } catch (err) {
        console.error('Error updating status on setup:', err.message);
      }
      
      socket.emit('connected');
    });

    // Join chat room
    socket.on('join chat', (room) => {
      socket.join(room);
      console.log(`User ${socket.user.username} joined room: ${room}`);
    });

    // Typing indicators
    socket.on('typing', (room) => {
      socket.in(room).emit('typing', room);
    });

    socket.on('stop typing', (room) => {
      socket.in(room).emit('stop typing', room);
    });

    // New Message event
    socket.on('new message', (newMessageReceived) => {
      const chat = newMessageReceived.chat;

      if (!chat.users) {
        return console.log('chat.users not defined');
      }

      // Send the message to all participants except the sender
      chat.users.forEach((user) => {
        const userId = typeof user === 'object' ? user._id : user;
        
        if (userId.toString() === newMessageReceived.sender._id.toString()) {
          return; // Skip the sender
        }

        // Emit to the user's personal room
        socket.in(userId.toString()).emit('message received', newMessageReceived);
      });
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      console.log(`Disconnected user: ${socket.user.username}`);
      
      try {
        // Mark user as offline and update lastSeen
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          lastSeen: new Date(),
        });
        
        // Broadcast to everyone that this user is offline
        io.emit('user offline', {
          userId: socket.user._id,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error('Error updating status on disconnect:', err.message);
      }
    });
  });

  return io;
};
