const db = require('../config/db');
const { grantXP, recordUserActivity } = require('./activityService');

const activeSockets = {}; // Mapping of user_id -> socket.id
const voicerooms = {};    // Keep track of active Voicerooms

function initSocketService(io) {
  io.on('connection', (socket) => {
    console.log('A user connected via socket:', socket.id);

    socket.on('register-socket', (userId) => {
      if (userId) {
        activeSockets[userId] = socket.id;
        socket.userId = userId;
        console.log(`Registered user_id ${userId} to socket_id ${socket.id}`);
      }
    });

    // Call routing: 'call-user'
    socket.on('call-user', (data) => {
      const targetSocketId = activeSockets[data.to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-made', {
          offer: data.offer,
          socket: socket.id,
          from: socket.userId
        });
      } else {
        socket.emit('call-error', { message: 'Target user is offline or not connected to signaling.' });
      }
    });

    // Answer routing: 'make-answer'
    socket.on('make-answer', (data) => {
      const targetSocketId = activeSockets[data.to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('answer-made', {
          socket: socket.id,
          answer: data.answer
        });
      }
    });

    // ICE Candidate routing
    socket.on('ice-candidate', (data) => {
      const targetSocketId = activeSockets[data.to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate-relay', {
          candidate: data.candidate
        });
      }
    });

    // Call termination event relay
    socket.on('end-call', (data) => {
      const targetSocketId = activeSockets[data.to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended');
      }
    });

    // ---------------- LIVE REAL-TIME PRIVATE CHAT SIGNALING ----------------
    socket.on('private-message', (data) => {
      const senderId = socket.userId;
      const receiverId = data.to;
      const content = data.content;

      if (!senderId || !receiverId || !content) return;

      // 1. Insert message to SQLite
      db.run(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [senderId, receiverId, content],
        function(err) {
          if (err) {
            console.error('Socket private-message insertion error:', err.message);
            return;
          }
          const messageId = this.lastID;

          // 2. Grant +10 XP to sender
          grantXP(senderId, 10, (err) => {
            if (err) console.error('Error granting message XP:', err);
            recordUserActivity(senderId, () => {
              const messageModel = {
                id: messageId,
                sender_id: senderId,
                receiver_id: receiverId,
                content: content,
                timestamp: new Date().toISOString()
              };

              // 3. Relay back to sender socket instantly
              socket.emit('message-relay', messageModel);

              // 4. Relay to receiver socket instantly if online
              const receiverSocketId = activeSockets[receiverId];
              if (receiverSocketId) {
                io.to(receiverSocketId).emit('message-relay', messageModel);
              }

              // 5. Special AI Coach handling
              db.get("SELECT id FROM users WHERE username = 'AI Coach'", [], (err, coach) => {
                if (!err && coach && parseInt(receiverId) === coach.id) {
                  const aiCoachId = coach.id;

                  // Generate AI response
                  let reply = '';
                  const msgLower = content.toLowerCase();
                  if (msgLower.includes('hola') || msgLower.includes('como') || msgLower.includes('espanol') || msgLower.includes('gracias')) {
                    reply = "¡Excelente esfuerzo! Your pronunciation and sentence structure look great. Quick tip: Remember that nouns ending in -a are usually feminine in Spanish! ¿De qué te gustaría hablar hoy?";
                  } else if (msgLower.includes('bonjour') || msgLower.includes('comment') || msgLower.includes('francais')) {
                    reply = "Formidable! You are articulating beautifully. Quick tip: In French, the letter 'h' is silent and vowels blend wonderfully. Qu'est-ce que vous aimez faire pendant votre temps libre?";
                  } else if (msgLower.includes('hello') || msgLower.includes('english') || msgLower.includes('thank')) {
                    reply = "Marvelous job! Your English sentence flow is highly natural. Quick tip: Practice using idioms to sound even more like a native speaker! What hobbies make you the happiest?";
                  } else {
                    reply = "Incredible dedication to language learning! You are doing amazing. Quick tip: Try speaking out loud to build muscle memory! What is your favorite learning goal for this week?";
                  }

                  // Delay reply by 2 seconds
                  setTimeout(() => {
                    db.run(
                      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
                      [aiCoachId, senderId, reply],
                      function(err) {
                        if (err) {
                          console.error('Error inserting AI Coach response:', err);
                          return;
                        }
                        const aiMessageModel = {
                          id: this.lastID,
                          sender_id: aiCoachId,
                          receiver_id: senderId,
                          content: reply,
                          timestamp: new Date().toISOString()
                        };
                        // Emit back to sender
                        socket.emit('message-relay', aiMessageModel);
                      }
                    );
                  }, 2000);
                }
              });
            });
          });
        }
      );
    });

    // ---------------- VOICEROOMS SIGNALS ----------------

    socket.on('voiceroom-join', ({ roomName, username }) => {
      socket.join(roomName);
      socket.roomName = roomName;
      socket.username = username;

      if (!voicerooms[roomName]) {
        voicerooms[roomName] = {
          hostId: socket.userId,
          members: []
        };
      }

      // Award +10 XP and record daily activity on join
      if (socket.userId) {
        grantXP(socket.userId, 10, (err) => {
          if (err) console.error('Error granting voiceroom join XP:', err);
          recordUserActivity(socket.userId);
        });
      }

      const alreadyJoined = voicerooms[roomName].members.some(m => m.userId === socket.userId);
      if (!alreadyJoined) {
        voicerooms[roomName].members.push({
          userId: socket.userId,
          username: username,
          socketId: socket.id,
          status: voicerooms[roomName].hostId === socket.userId ? 'panel' : 'audience',
          isMuted: false
        });
      }

      // Broadcast updated room state
      io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
      console.log(`Socket ${socket.id} (User ${username}) joined voiceroom: ${roomName}`);
    });

    socket.on('voiceroom-toggle-mute', ({ isMuted }) => {
      const roomName = socket.roomName;
      if (roomName && voicerooms[roomName]) {
        const member = voicerooms[roomName].members.find(m => m.socketId === socket.id);
        if (member) {
          member.isMuted = !!isMuted;
          io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
        }
      }
    });

    socket.on('voiceroom-raise-hand', () => {
      const roomName = socket.roomName;
      if (roomName && voicerooms[roomName]) {
        const member = voicerooms[roomName].members.find(m => m.socketId === socket.id);
        if (member && member.status === 'audience') {
          member.status = 'hand-raised';
          io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
        }
      }
    });

    socket.on('voiceroom-approve-speaker', ({ targetSocketId }) => {
      const roomName = socket.roomName;
      if (roomName && voicerooms[roomName]) {
        // Ensure only host can approve
        if (voicerooms[roomName].hostId === socket.userId) {
          const member = voicerooms[roomName].members.find(m => m.socketId === targetSocketId);
          if (member) {
            member.status = 'panel';
            io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
            // Direct signal to approved socket to establish WebRTC connections if applicable
            io.to(targetSocketId).emit('voiceroom-approved');
          }
        }
      }
    });

    socket.on('voiceroom-leave', () => {
      handleVoiceroomLeave(socket);
    });

    // Cleanup on socket disconnection
    socket.on('disconnect', () => {
      console.log('User socket disconnected:', socket.id);
      if (socket.userId && activeSockets[socket.userId] === socket.id) {
        delete activeSockets[socket.userId];
      }
      handleVoiceroomLeave(socket);
    });
  });
}

function handleVoiceroomLeave(socket) {
  const roomName = socket.roomName;
  if (roomName && voicerooms[roomName]) {
    voicerooms[roomName].members = voicerooms[roomName].members.filter(m => m.socketId !== socket.id);

    // If room becomes empty, tear it down
    if (voicerooms[roomName].members.length === 0) {
      delete voicerooms[roomName];
    } else {
      // If host left, designate next member as host
      if (voicerooms[roomName].hostId === socket.userId) {
        voicerooms[roomName].hostId = voicerooms[roomName].members[0].userId;
        voicerooms[roomName].members[0].status = 'panel';
      }
      io.to(roomName).emit('voiceroom-state', voicerooms[roomName]);
    }
    socket.leave(roomName);
    socket.roomName = null;
  }
}

module.exports = {
  initSocketService
};
