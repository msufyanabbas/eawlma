import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

// The mobile app uses a single Socket.IO connection that mirrors the web
// client's behavior: it talks to the `/messaging` namespace (the only one the
// backend exposes today). Notification events are emitted by the backend over
// the same socket, so listening here keeps notifications/messages/inquiries
// invalidating React Query caches in real time.
let socket: Socket | null = null;

export function getMobileSocket(): Socket | null {
  return socket;
}

export function useWebSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      socket?.disconnect();
      socket = null;
      return;
    }

    let cancelled = false;

    const connectSocket = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token || cancelled) return;

      // expoConfig.extra.apiUrl ends with /api/v1; strip it so we land on the
      // server root before appending the namespace path.
      const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) || '';
      const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

      const sock = io(`${baseUrl}/messaging`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      sock.on('connect', () => {
        if (__DEV__) console.log('[ws] connected');
      });

      sock.on('disconnect', (reason) => {
        if (__DEV__) console.log('[ws] disconnected:', reason);
      });

      sock.on('connect_error', (err) => {
        if (__DEV__) console.log('[ws] connect_error:', err.message);
      });

      sock.on('notification', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      });

      sock.on('message', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations-unread'] });
      });

      sock.on('conversation:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['conversations-unread'] });
      });

      sock.on('inquiry', () => {
        queryClient.invalidateQueries({ queryKey: ['inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      if (!cancelled) socket = sock;
      else sock.disconnect();
    };

    void connectSocket();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, userId, queryClient]);
}
