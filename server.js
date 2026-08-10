const http = require('http');
const { Server } = require('socket.io');
const { createServer } = require('./src/app');
const { initSocketService } = require('./src/services/socketService');

const PORT = process.env.PORT || 3000;

// Create Express App
const app = createServer();

// Create HTTP Server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Initialize real-time Socket.io service orchestrator
initSocketService(io);

// Start Server listener
server.listen(PORT, () => {
  console.log(`GlobalTalk platform running on http://localhost:${PORT}`);
});
