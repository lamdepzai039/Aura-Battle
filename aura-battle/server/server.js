import express from 'express';
import { WebSocketServer } from 'ws';
import { getLeaderboard, getProfile, getProfileByUsername, hasSupabase, requireUser, supabaseAdmin } from './supabase.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const rooms = new Map();
const socketRooms = new Map();
const matchmakingQueues = new Map();
const socketQueue = new Map();
const ROOM_CAPACITIES = { '1v1': 2, '2v2': 4, '3v3': 6 };

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

function normalizeFormat(value) {
  return value === '2v2' || value === '3v3' ? value : '1v1';
}

function roomCapacity(format) {
  return ROOM_CAPACITIES[normalizeFormat(format)];
}

function makePlayer(id, name, index, ready = false, connected = true) {
  return { id, name: normalizeUsername(name), team: index % 2 === 0 ? 'A' : 'B', ready, connected };
}

function removeFromMatchmaking(ws) {
  const format = socketQueue.get(ws);
  if (!format) return;
  const queue = matchmakingQueues.get(format) || [];
  matchmakingQueues.set(format, queue.filter((entry) => entry.ws !== ws));
  socketQueue.delete(ws);
}

function startQueuedMatch(format) {
  const capacity = roomCapacity(format);
  const queue = matchmakingQueues.get(format) || [];
  if (queue.length < capacity) return;

  const group = queue.splice(0, capacity);
  matchmakingQueues.set(format, queue);
  const code = makeRoomCode();
  const players = group.map((entry, index) => {
    const player = makePlayer(`p${index + 1}`, entry.username, index, true, true);
    player.socket = entry.ws;
    return player;
  });
  const room = {
    code,
    host: players[0].name,
    hostSocket: players[0].socket,
    hostReady: true,
    guest: players[1]?.name || null,
    guestSocket: players[1]?.socket || null,
    guestReady: Boolean(players[1]),
    clients: players.map((player) => player.socket),
    createdAt: new Date().toISOString(),
    phase: 'playing',
    startedAt: new Date().toISOString(),
    matchSeed: Date.now(),
    format,
    maxPlayers: capacity,
    players,
  };
  rooms.set(code, room);
  room.clients.forEach((client) => {
    socketRooms.set(client, code);
    socketQueue.delete(client);
  });
  broadcastMatchStart(code);
}

function getRoomSnapshot(room) {
  const host = room.host ? normalizeUsername(room.host) : 'Host';
  const guest = room.guest ? normalizeUsername(room.guest) : null;
  return {
    code: room.code,
    host,
    guest,
    status: guest ? 'ready' : 'waiting',
    phase: room.phase || 'waiting',
    createdAt: room.createdAt,
    hostReady: Boolean(room.hostReady),
    guestReady: Boolean(room.guestReady),
    startedAt: room.startedAt || null,
    matchSeed: room.matchSeed || null,
    format: room.format || '1v1',
    maxPlayers: room.maxPlayers || roomCapacity(room.format),
    players: (room.players || []).map(({ id, name, team, ready, socket }) => ({ id, name: normalizeUsername(name), team, ready: Boolean(ready), connected: Boolean(socket) })),
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  ensureRoomState(room);
  room.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    const player = room.players.find((candidate) => candidate.socket === client);
    client.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(room), you: player?.id || null }));
  });
}

function broadcastMatchStart(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  ensureRoomState(room);
  room.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    const player = room.players.find((candidate) => candidate.socket === client);
    client.send(JSON.stringify({ type: 'match_start', room: getRoomSnapshot(room), seed: room.matchSeed, startedAt: room.startedAt, you: player?.id || null }));
  });
}

function ensureRoomState(room) {
  room.format = normalizeFormat(room.format);
  room.maxPlayers = room.maxPlayers || roomCapacity(room.format);
  if (!room.phase) room.phase = 'waiting';
  if (!room.clients) room.clients = [];
  if (!room.players) room.players = [];
  if (!room.players.length && room.host) room.players.push(makePlayer('p1', room.host, 0, room.hostReady, Boolean(room.hostSocket)));
  if (room.guest && !room.players.some((player) => player.id === 'p2')) room.players.push(makePlayer('p2', room.guest, 1, room.guestReady, Boolean(room.guestSocket)));
  if (!room.hostReady) room.hostReady = false;
  if (!room.guestReady) room.guestReady = false;
  if (!room.matchSeed) room.matchSeed = null;
  const connectedPlayers = room.players.filter((player) => player.socket);
  if (room.phase === 'playing' && connectedPlayers.length < 2) room.phase = 'waiting';
  if (connectedPlayers.length >= 2 && connectedPlayers.every((player) => player.ready) && room.phase !== 'playing') room.phase = 'ready';
  if (connectedPlayers.length < 2) room.phase = 'waiting';
}

function leaveRoom(ws) {
  removeFromMatchmaking(ws);
  const roomCode = socketRooms.get(ws);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) {
    socketRooms.delete(ws);
    return;
  }

  const player = room.players?.find((candidate) => candidate.socket === ws);
  if (!player) {
    socketRooms.delete(ws);
    return;
  }

  player.socket = null;
  player.connected = false;
  player.ready = false;
  if (player.id === 'p1' && room.clients.length <= 1) {
    rooms.delete(roomCode);
    room.clients = room.clients.filter((client) => client !== ws);
    socketRooms.delete(ws);
    return;
  }

  room.clients = room.clients.filter((client) => client !== ws);
  socketRooms.delete(ws);
  room.hostSocket = room.players.find((candidate) => candidate.id === 'p1')?.socket || null;
  room.guestSocket = room.players.find((candidate) => candidate.id === 'p2')?.socket || null;
  room.host = room.players.find((candidate) => candidate.id === 'p1')?.name || room.host;
  room.guest = room.players.find((candidate) => candidate.id === 'p2' && candidate.connected)?.name || null;
  room.hostReady = Boolean(room.players.find((candidate) => candidate.id === 'p1')?.ready);
  room.guestReady = Boolean(room.players.find((candidate) => candidate.id === 'p2')?.ready);
  room.startedAt = null;
  room.matchSeed = null;

  if (room.clients.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  ensureRoomState(room);
  broadcastRoom(roomCode);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, persistence: hasSupabase ? 'supabase' : 'unconfigured' });
});

app.get('/api/rank/leaderboard', async (_req, res) => {
  try {
    if (!hasSupabase) {
      res.status(503).json({ error: 'Supabase persistence is not configured.' });
      return;
    }
    const profiles = await getLeaderboard();
    res.json({ profiles });
  } catch (error) {
    console.error('[AuraBattle][Rank] leaderboard error', error);
    res.status(500).json({ error: 'Unable to load leaderboard.' });
  }
});

app.post('/api/rank/match', express.json(), async (req, res) => {
  if (typeof req.body?.playerA !== 'string' || typeof req.body?.playerB !== 'string') {
    res.status(400).json({ error: 'playerA and playerB are required.' });
    return;
  }
  const playerA = normalizeUsername(req.body.playerA);
  const playerB = normalizeUsername(req.body.playerB);
  const outcome = req.body.outcome;
  if (!playerA || !playerB || playerA === playerB || !['win', 'loss', 'tie'].includes(outcome)) {
    res.status(400).json({ error: 'playerA, playerB and a valid outcome are required.' });
    return;
  }
  try {
    if (!hasSupabase) {
      res.status(503).json({ error: 'Supabase persistence is not configured.' });
      return;
    }
    const user = await requireUser(req);
    const current = await getProfile(user.id);
    const opponent = await getProfileByUsername(playerB);
    if (!current || current.username.toLowerCase() !== playerA.toLowerCase() || !opponent) {
      res.status(403).json({ error: 'Player identity does not match the authenticated user.' });
      return;
    }
    const { data, error } = await supabaseAdmin.rpc('record_rank_match', { p_player_a: user.id, p_player_b: opponent.id, p_outcome: outcome, p_mode: req.body.mode || 'online' });
    if (error) throw error;
    res.json({ profiles: data || [] });
  } catch (error) {
    console.error('[AuraBattle][Rank] match error', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to record match.' });
  }
});

app.post('/api/rank/team-match', express.json(), async (req, res) => {
  const teamA = Array.isArray(req.body?.teamA) ? req.body.teamA.filter((name) => typeof name === 'string') : [];
  const teamB = Array.isArray(req.body?.teamB) ? req.body.teamB.filter((name) => typeof name === 'string') : [];
  const outcome = req.body?.outcome;
  if (!teamA.length || !teamB.length || !['win', 'loss', 'tie'].includes(outcome)) {
    res.status(400).json({ error: 'teamA, teamB and a valid outcome are required.' });
    return;
  }
  try {
    if (!hasSupabase) {
      res.status(503).json({ error: 'Supabase persistence is not configured.' });
      return;
    }
    const user = await requireUser(req);
    const current = await getProfile(user.id);
    const allNames = [...teamA, ...teamB].map((name) => name.toLowerCase());
    if (!current || !allNames.includes(current.username.toLowerCase())) {
      res.status(403).json({ error: 'Authenticated player is not part of this team match.' });
      return;
    }
    const resolveTeam = async (names) => {
      const profiles = await Promise.all(names.map((name) => getProfileByUsername(name)));
      if (profiles.some((profile) => !profile)) throw Object.assign(new Error('Team player profile not found.'), { statusCode: 400 });
      return profiles.map((profile) => profile.id);
    };
    const { data, error } = await supabaseAdmin.rpc('record_team_rank_match', { p_team_a: await resolveTeam(teamA), p_team_b: await resolveTeam(teamB), p_outcome: outcome, p_mode: req.body.mode || 'duo' });
    if (error) throw error;
    res.json({ profiles: data || [] });
  } catch (error) {
    console.error('[AuraBattle][Rank] team match error', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to record team match.' });
  }
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

      if (message.type === 'queue_match') {
        const format = normalizeFormat(message.format);
        removeFromMatchmaking(ws);
        const queue = matchmakingQueues.get(format) || [];
        queue.push({ ws, username: normalizeUsername(message.username || 'Player') });
        matchmakingQueues.set(format, queue);
        socketQueue.set(ws, format);
        ws.send(JSON.stringify({ type: 'queue_joined', format, position: queue.length, startedAt: new Date().toISOString() }));
        startQueuedMatch(format);
        return;
      }

      if (message.type === 'cancel_queue') {
        removeFromMatchmaking(ws);
        ws.send(JSON.stringify({ type: 'queue_cancelled' }));
        return;
      }

      if (message.type === 'create_room') {
        const existingRoomCode = socketRooms.get(ws);
        if (existingRoomCode) {
          const existingRoom = rooms.get(existingRoomCode);
          if (existingRoom) {
            ws.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(existingRoom), you: 'host' }));
            return;
          }
        }

        const code = makeRoomCode();
        const format = normalizeFormat(message.format);
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
          format,
          maxPlayers: roomCapacity(format),
          players: [makePlayer('p1', message.username || 'Host', 0, false, true)],
        };

        room.players[0].socket = ws;
        rooms.set(code, room);
        socketRooms.set(ws, code);
        ws.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(room), you: 'host' }));
        return;
      }

      if (message.type === 'join_room') {
        const room = rooms.get(message.code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' }));
          return;
        }

        if (socketRooms.get(ws) === room.code) {
          ws.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(room), you: room.hostSocket === ws ? 'host' : 'guest' }));
          return;
        }

        if (room.clients.length >= room.maxPlayers) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is already full.' }));
          return;
        }

        const index = room.players.findIndex((player) => !player.connected);
        const seatIndex = index >= 0 ? index : room.players.length;
        const player = makePlayer(`p${seatIndex + 1}`, message.username || 'Guest', seatIndex, false, true);
        player.socket = ws;
        if (index >= 0) room.players[index] = player;
        else room.players.push(player);
        if (seatIndex === 1) {
          room.guest = player.name;
          room.guestSocket = ws;
          room.guestReady = false;
        }
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

        const requestedName = normalizeUsername(message.username || '');

        if (socketRooms.get(ws) === room.code) {
          ws.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(room), you: room.hostSocket === ws ? 'host' : 'guest' }));
          return;
        }

        const player = room.players.find((candidate) => candidate.name === requestedName);
        if (player) {
          if (player.socket && player.socket !== ws) {
            room.clients = room.clients.filter((client) => client !== player.socket);
            socketRooms.delete(player.socket);
          }
          player.socket = ws;
          player.connected = true;
          room.hostSocket = room.players.find((candidate) => candidate.id === 'p1')?.socket || null;
          room.guestSocket = room.players.find((candidate) => candidate.id === 'p2')?.socket || null;
          room.host = room.players.find((candidate) => candidate.id === 'p1')?.name || room.host;
          room.guest = room.players.find((candidate) => candidate.id === 'p2')?.name || null;
          room.clients.push(ws);
          socketRooms.set(ws, room.code);
          broadcastRoom(room.code);
          return;
        }

        if (room.hostSocket === ws || room.guestSocket === ws) {
          socketRooms.set(ws, room.code);
          ws.send(JSON.stringify({ type: 'room_state', room: getRoomSnapshot(room), you: room.hostSocket === ws ? 'host' : 'guest' }));
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

        const player = room.players.find((candidate) => candidate.socket === ws);
        if (!player) {
          ws.send(JSON.stringify({ type: 'error', message: 'You are not part of this room.' }));
          return;
        }
        player.ready = Boolean(message.ready);
        if (player.id === 'p1') room.hostReady = player.ready;
        if (player.id === 'p2') room.guestReady = player.ready;

        ensureRoomState(room);
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
        const connectedPlayers = room.players.filter((player) => player.socket);
        if (connectedPlayers.length < 2) {
          ws.send(JSON.stringify({ type: 'error', message: 'Waiting for players.' }));
          return;
        }
        if (!connectedPlayers.every((player) => player.ready)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Every connected player must be ready before starting.' }));
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

      if (message.type === 'webrtc_signal') {
        const roomCode = socketRooms.get(ws);
        const room = roomCode ? rooms.get(roomCode) : null;
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'No room for this client.' }));
          return;
        }
        const sender = room.players.find((player) => player.socket === ws);
        if (!sender) {
          ws.send(JSON.stringify({ type: 'error', message: 'You are not part of this room.' }));
          return;
        }
        const targetPlayer = room.players.find((player) => player.id === message.target)
          || room.players.find((player) => (message.target === 'host' && player.id === 'p1') || (message.target === 'guest' && player.id === 'p2'));
        const targetSocket = targetPlayer?.socket;
        if (!targetSocket || targetSocket === ws) {
          console.warn('[AuraBattle][Server] peer signal rejected', { roomCode, from: sender.id, target: message.target, reason: 'Peer is not connected yet.' });
          ws.send(JSON.stringify({ type: 'error', message: 'Peer is not connected yet.' }));
          return;
        }

        console.info('[AuraBattle][Server] forwarding signal', {
          roomCode,
          from: sender.id,
          to: targetPlayer.id,
          signalType: message.signal?.type,
        });
        targetSocket.send(JSON.stringify({
          type: 'webrtc_signal',
          from: sender.id,
          to: targetPlayer.id,
          signal: message.signal,
          roomCode,
        }));
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
      console.error('Invalid lobby message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message.' }));
    }
  });

  ws.on('close', () => leaveRoom(ws));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
