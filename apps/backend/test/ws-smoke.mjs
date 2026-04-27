// Quick WebSocket smoke test for the /messaging gateway.
//
// Run from the repo root, with a backend running on localhost:3010:
//   node apps/backend/test/ws-smoke.mjs <agentToken> <buyerToken> <conversationId>
//
// Exits 0 on success (≥2 message events seen across both clients), 1 otherwise.

import { io as ioClient } from 'socket.io-client';

const [, , agentToken, buyerToken, conversationId] = process.argv;
if (!agentToken || !buyerToken || !conversationId) {
  console.error('usage: node ws-smoke.mjs <agentToken> <buyerToken> <conversationId>');
  process.exit(2);
}

const URL = process.env.WS_URL || 'http://localhost:3010/messaging';

const agent = ioClient(URL, {
  transports: ['websocket'],
  auth: { token: agentToken },
});
const buyer = ioClient(URL, {
  transports: ['websocket'],
  auth: { token: buyerToken },
});

let received = 0;
let conversationUpdates = 0;
let readReceipts = 0;
let typingEvents = 0;

const log = (who, evt, payload) => {
  const out = typeof payload === 'object' ? JSON.stringify(payload) : payload;
  console.log(`[${who}] ${evt} ${out ?? ''}`);
};

agent.on('connect', () => {
  log('agent', 'connect', `id=${agent.id}`);
  agent.emit('joinConversation', { conversationId }, (ack) =>
    log('agent', 'joinAck', ack),
  );
});
buyer.on('connect', () => {
  log('buyer', 'connect', `id=${buyer.id}`);
  buyer.emit('joinConversation', { conversationId }, (ack) =>
    log('buyer', 'joinAck', ack),
  );
});

agent.on('connect_error', (err) => {
  log('agent', 'connect_error', err.message);
  process.exit(1);
});
buyer.on('connect_error', (err) => {
  log('buyer', 'connect_error', err.message);
  process.exit(1);
});

agent.on('message', (m) => {
  log('agent', 'message', { senderId: m.senderId, body: m.body, id: m.id });
  received += 1;
});
buyer.on('message', (m) => {
  log('buyer', 'message', { senderId: m.senderId, body: m.body, id: m.id });
  received += 1;
});

agent.on('typing', (e) => {
  log('agent', 'typing', e);
  typingEvents += 1;
});
buyer.on('typing', (e) => {
  log('buyer', 'typing', e);
});

agent.on('readReceipt', (e) => {
  log('agent', 'readReceipt', e);
  readReceipts += 1;
});
buyer.on('readReceipt', (e) => {
  log('buyer', 'readReceipt', e);
  readReceipts += 1;
});

agent.on('conversation:updated', (e) => {
  log('agent', 'conv:updated', { conversationId: e.conversationId, lastSenderId: e.lastSenderId });
  conversationUpdates += 1;
});
buyer.on('conversation:updated', (e) => {
  log('buyer', 'conv:updated', { conversationId: e.conversationId, lastSenderId: e.lastSenderId });
  conversationUpdates += 1;
});

// Choreograph the smoke test:
//   t=800ms   buyer is typing (agent should see it)
//   t=1200ms  buyer sends a message (both rooms should see it)
//   t=1700ms  agent replies (both rooms should see it)
//   t=2300ms  agent marks as read
//   t=3000ms  shut down
setTimeout(() => buyer.emit('typing', { conversationId, isTyping: true }), 800);

setTimeout(
  () =>
    buyer.emit(
      'sendMessage',
      { conversationId, body: 'Hi from buyer over WebSocket!' },
      (ack) => log('buyer', 'sendAck', { id: ack?.id, body: ack?.body }),
    ),
  1200,
);

setTimeout(
  () =>
    agent.emit(
      'sendMessage',
      { conversationId, body: 'Hi back from agent over WebSocket!' },
      (ack) => log('agent', 'sendAck', { id: ack?.id, body: ack?.body }),
    ),
  1700,
);

setTimeout(
  () =>
    agent.emit('markAsRead', { conversationId }, (ack) =>
      log('agent', 'readAck', ack),
    ),
  2300,
);

setTimeout(() => {
  console.log(
    `\n=== summary: ${received} message events, ${typingEvents} typing events, ${readReceipts} read receipts, ${conversationUpdates} conversation:updated events ===`,
  );
  agent.close();
  buyer.close();

  // Success criteria:
  //   - both clients saw both messages → received >= 4 (2 messages × 2 clients in conversation room)
  //   - at least one typing event reached the agent
  //   - at least one read receipt fired
  //   - at least one conversation:updated reached each user-room
  const ok =
    received >= 4 &&
    typingEvents >= 1 &&
    readReceipts >= 1 &&
    conversationUpdates >= 2;
  process.exit(ok ? 0 : 1);
}, 3000);
