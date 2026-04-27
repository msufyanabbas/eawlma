import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.IO client connected to the /messaging
 * namespace. Reconnects with the current access token on each call so a
 * fresh JWT is always presented during the handshake.
 */
export function getMessagingSocket(): Socket {
  const token = useAuthStore.getState().getAccessToken();
  if (socket && socket.connected) return socket;
  if (socket) socket.close();
  socket = io(`${SOCKET_URL}/messaging`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectMessagingSocket(): void {
  if (socket) {
    socket.close();
    socket = null;
  }
}
