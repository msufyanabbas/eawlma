// Verifies that the /messaging gateway rejects sockets without a valid JWT.
// Exits 0 if both unauthenticated and bad-token sockets are rejected.
import { io as ioClient } from 'socket.io-client';

const URL = process.env.WS_URL || 'http://localhost:3010/messaging';

const trial = (label, opts) =>
  new Promise((resolve) => {
    const s = ioClient(URL, { transports: ['websocket'], reconnection: false, ...opts });
    let settled = false;
    const finish = (ok, why) => {
      if (settled) return;
      settled = true;
      console.log(`[${label}] ${ok ? 'rejected ✓' : 'unexpectedly accepted ✗'} (${why})`);
      s.close();
      resolve(ok);
    };
    s.on('connect_error', (err) => finish(true, err.message));
    s.on('connect', () => finish(false, 'connected'));
    setTimeout(() => finish(false, 'timeout'), 4000);
  });

const noToken = await trial('no-token', { auth: {} });
const badToken = await trial('bad-token', { auth: { token: 'not.a.real.jwt' } });

console.log(`\n=== auth rejection: no-token=${noToken} bad-token=${badToken} ===`);
process.exit(noToken && badToken ? 0 : 1);
