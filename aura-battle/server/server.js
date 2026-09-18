import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const rooms = new Map();
const socketRooms = new Map();

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function normalizeRoom(room) {
  return {
    code: room.code,
    host: room.host,
    guest: room.guest || null,
    status: room.guest ? 'ready' : 'waiting',
    createdAt: room.createdAt,
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify({ type: 'room_state', room: normalizeRoom(room) });
  room.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

function leaveRoom(ws) {
  const roomCode = socketRooms.get(ws);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) {
    socketRooms.delete(ws);
    return;
  }

  const isHost = room.hostSocket === ws;
  const isGuest = room.guestSocket === ws;

  if (isHost) {
    room.host = room.guest || 'Host';
    room.hostSocket = room.guestSocket || null;
    room.guest = null;
    room.guestSocket = null;
  }
  if (isGuest) {
    room.guest = null;
    room.guestSocket = null;
  }

  room.clients = room.clients.filter((client) => client !== ws);
  socketRooms.delete(ws);

  if (!room.guest && !room.hostSocket && room.clients.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  if (!room.guest && room.hostSocket) {
    room.status = 'waiting';
  }

  broadcastRoom(roomCode);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const server = app.listen(PORT, () => {
  console.log(`Aura Battle backend listening on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'create_room') {
        const code = makeRoomCode();
        const room = {
          code,
          host: message.username || 'Host',
          hostSocket: ws,
          guest: null,
          guestSocket: null,
          clients: [ws],
          createdAt: new Date().toISOString(),
          status: 'waiting',
        };

        rooms.set(code, room);
        socketRooms.set(ws, code);
        ws.send(JSON.stringify({ type: 'room_state', room: normalizeRoom(room) }));
        return;
      }

      if (message.type === 'join_room') {
        const room = rooms.get(message.code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' }));
          return;
        }

        if (room.guest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is already full.' }));
          return;
        }

        room.guest = message.username || 'Guest';
        room.guestSocket = ws;
        room.status = 'ready';
        room.clients.push(ws);
        socketRooms.set(ws, room.code);
        broadcastRoom(room.code);
        return;
      }

      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message.' }));
    }
  });

  ws.on('close', () => leaveRoom(ws));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
