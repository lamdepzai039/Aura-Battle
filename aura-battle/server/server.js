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

function normalizeUsername(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.slice(0, 24).replace(/[^\p{L}\p{N}\s_.-]/gu, '').trim() || 'Player';
}

function normalizeRoom(room) {
  return {
    code: room.code,
    host: normalizeUsername(room.host),
    guest: room.guest ? normalizeUsername(room.guest) : null,
    status: room.guest ? 'ready' : 'waiting',
    phase: room.phase || 'waiting',
    createdAt: room.createdAt,
    hostReady: Boolean(room.hostReady),
    guestReady: Boolean(room.guestReady),
    startedAt: room.startedAt || null,
    matchSeed: room.matchSeed || null,
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

function broadcastMatchStart(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify({
    type: 'match_start',
    room: normalizeRoom(room),
    seed: room.matchSeed,
    startedAt: room.startedAt,
  });
  room.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

function ensureRoomState(room) {
  if (!room.phase) room.phase = 'waiting';
  if (!room.clients) room.clients = [];
  if (!room.hostReady) room.hostReady = false;
  if (!room.guestReady) room.guestReady = false;
  if (!room.matchSeed) room.matchSeed = null;
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

  if (isHost && room.guestSocket) {
    room.host = room.guest || 'Host';
    room.hostSocket = room.guestSocket;
    room.hostReady = room.guestReady;
    room.guest = null;
    room.guestSocket = null;
    room.guestReady = false;
    room.phase = 'waiting';
  } else if (isHost) {
    room.host = 'Host';
    room.hostSocket = null;
    room.hostReady = false;
    room.guest = null;
    room.guestSocket = null;
    room.guestReady = false;
    room.phase = 'waiting';
  }

  if (isGuest) {
    room.guest = null;
    room.guestSocket = null;
    room.guestReady = false;
    room.phase = 'waiting';
  }

  room.clients = room.clients.filter((client) => client !== ws);
  socketRooms.delete(ws);

  if (!room.hostSocket && room.clients.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  if (!room.guest && room.hostSocket) {
    room.phase = 'waiting';
  }

  ensureRoomState(room);
  broadcastRoom(roomCode);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const server = app.listen(PORT, () => {
  console.log(`Aura Battle backend listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is already in use. The backend is already running or another service is using it.`);
    process.exitCode = 0;
    return;
  }

  throw error;
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'create_room') {
        const existingRoomCode = socketRooms.get(ws);
        if (existingRoomCode) {
          const existingRoom = rooms.get(existingRoomCode);
          if (existingRoom) {
            ws.send(JSON.stringify({ type: 'room_state', room: normalizeRoom(existingRoom), you: 'host' }));
            return;
          }
        }

        const code = makeRoomCode();
        const room = {
          code,
          host: normalizeUsername(message.username || 'Host'),
          hostSocket: ws,
          hostReady: false,
          guest: null,
          guestSocket: null,
          guestReady: false,
          clients: [ws],
          createdAt: new Date().toISOString(),
          phase: 'waiting',
          startedAt: null,
          matchSeed: null,
        };

        rooms.set(code, room);
        socketRooms.set(ws, code);
        ws.send(JSON.stringify({ type: 'room_state', room: normalizeRoom(room), you: 'host' }));
        return;
      }

      if (message.type === 'join_room') {
        const room = rooms.get(message.code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' }));
          return;
        }

        if (socketRooms.get(ws) === room.code) {
          ws.send(JSON.stringify({ type: 'room_state', room: normalizeRoom(room), you: 'guest' }));
          return;
        }

        if (room.guest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is already full.' }));
          return;
        }

        room.guest = normalizeUsername(message.username || 'Guest');
        room.guestSocket = ws;
        room.phase = 'ready';
        room.clients.push(ws);
        socketRooms.set(ws, room.code);
        broadcastRoom(room.code);
        return;
      }

      if (message.type === 'rejoin_room') {
        const room = rooms.get(message.code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' }));
          return;
        }

        const requestedHost = normalizeUsername(message.username || '');

        if (socketRooms.get(ws) === room.code) {
          ws.send(JSON.stringify({ type: 'room_state', room: normalizeRoom(room), you: requestedHost === room.host ? 'host' : 'guest' }));
          return;
        }

        if (requestedHost === room.host && !room.hostSocket) {
          room.host = requestedHost;
          room.hostSocket = ws;
          room.clients.push(ws);
          socketRooms.set(ws, room.code);
          broadcastRoom(room.code);
          return;
        }

        if (requestedHost === room.guest && !room.guestSocket) {
          room.guest = requestedHost;
          room.guestSocket = ws;
          room.clients.push(ws);
          socketRooms.set(ws, room.code);
          broadcastRoom(room.code);
          return;
        }

        ws.send(JSON.stringify({ type: 'error', message: 'Unable to reconnect to this room.' }));
        return;
      }

      if (message.type === 'set_ready') {
        const roomCode = socketRooms.get(ws);
        const room = roomCode ? rooms.get(roomCode) : undefined;
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'No room for this client.' }));
          return;
        }

        if (room.hostSocket === ws) room.hostReady = Boolean(message.ready);
        if (room.guestSocket === ws) room.guestReady = Boolean(message.ready);

        if (room.hostReady && room.guestReady && room.guest) {
          room.phase = 'ready';
        }

        broadcastRoom(roomCode);
        return;
      }

      if (message.type === 'start_battle') {
        const roomCode = socketRooms.get(ws);
        const room = roomCode ? rooms.get(roomCode) : null;
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'No room for this client.' }));
          return;
        }
        if (room.hostSocket !== ws) {
          ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the battle.' }));
          return;
        }
        if (!room.guest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Waiting for a challenger.' }));
          return;
        }

        room.phase = 'playing';
        room.startedAt = new Date().toISOString();
        room.matchSeed = Date.now();
        room.hostReady = true;
        room.guestReady = true;
        broadcastMatchStart(roomCode);
        return;
      }

      if (message.type === 'leave_room') {
        leaveRoom(ws);
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
