import { io, Socket } from 'socket.io-client';
import { useStore } from '../../store';

// Direct backend WebSocket endpoint (Pure WebSocket transport - zero polling)
const WS_URL =
  (import.meta as any).env?.VITE_WS_URL ||
  'http://98.130.105.188';

let socket: Socket | null = null;
let broadcastChannel: BroadcastChannel | null = null;

// Cross-tab local channel for instant 0ms sync between open tabs on the same machine
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel('akr_credit_realtime');
    broadcastChannel.onmessage = (event) => {
      if (event && event.data) {
        handleIncomingRealtimeEvent(event.data.type, event.data.payload, 'broadcast_channel');
      }
    };
  } catch (err) {
    console.warn('[Realtime] BroadcastChannel unavailable:', err);
  }
}

/**
 * Handle incoming real-time payload from either WebSocket or BroadcastChannel
 */
function handleIncomingRealtimeEvent(type: string, payload: any, source: string) {
  if (!payload) return;
  console.log(`[Realtime Sync] Received ${type} via ${source}:`, payload);

  switch (type) {
    case 'CONSUMER_UPDATED':
    case 'ADMIN_CONSUMER_UPDATED': {
      const { consumerId, creditLimit, cardApproved, cardStatus, mobile } = payload;
      if (!consumerId && !mobile) return;

      const store = useStore.getState();

      // 1. Update consumer in store directory (if admin or present)
      store.updateConsumerProfile(consumerId, {
        creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined,
        cardApproved,
        cardStatus,
      });

      // 2. Synchronize active consumerSession & local storage if this is the logged-in customer
      const currentSession = store.consumerSession;
      if (
        currentSession &&
        (currentSession.consumer.id === consumerId || currentSession.consumer.mobile === mobile)
      ) {
        const updatedConsumer = {
          ...currentSession.consumer,
          creditLimit: creditLimit !== undefined ? Number(creditLimit) : currentSession.consumer.creditLimit,
          cardApproved: cardApproved !== undefined ? cardApproved : currentSession.consumer.cardApproved,
          cardStatus: cardStatus || currentSession.consumer.cardStatus,
        };

        const newSession = {
          ...currentSession,
          consumer: updatedConsumer,
        };

        useStore.setState({ consumerSession: newSession });

        try {
          localStorage.setItem('akr_consumer_session', JSON.stringify(newSession));
          localStorage.setItem('akr_consumer_profile', JSON.stringify(updatedConsumer));
        } catch (e) {
          // ignore storage quota error
        }
      }

      // 3. Dispatch window event for custom listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('akr_consumer_realtime_update', { detail: payload })
        );
      }
      break;
    }

    case 'DUES_UPDATED':
    case 'ADMIN_DUES_UPDATED': {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('akr_dues_realtime_update', { detail: payload })
        );
      }
      break;
    }

    case 'PAYMENT_RECEIVED':
    case 'ADMIN_PAYMENT_RECEIVED': {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('akr_payment_realtime_update', { detail: payload })
        );
      }
      break;
    }

    case 'NOTIFICATION_NEW': {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('akr_notif_realtime_update', { detail: payload })
        );
      }
      break;
    }

    default:
      break;
  }
}

/**
 * Initializes the pure WebSocket connection and binds channel listeners.
 */
export function initRealtimeSocket(): Socket {
  if (socket) return socket;

  socket = io(WS_URL, {
    path: '/api/socket.io',
    transports: ['websocket'], // PURE WEBSOCKET ONLY: zero HTTP long-polling overhead
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Realtime] WebSocket connected successfully (id:', socket?.id, ')');
    syncRoomsWithCurrentAuth();
  });

  socket.on('reconnect', () => {
    console.log('[Realtime] WebSocket reconnected');
    syncRoomsWithCurrentAuth();
  });

  socket.on('disconnect', (reason) => {
    console.log('[Realtime] WebSocket disconnected:', reason);
  });

  // Listen to remote events
  socket.on('CONSUMER_UPDATED', (data) => handleIncomingRealtimeEvent('CONSUMER_UPDATED', data, 'websocket'));
  socket.on('ADMIN_CONSUMER_UPDATED', (data) => handleIncomingRealtimeEvent('ADMIN_CONSUMER_UPDATED', data, 'websocket'));
  socket.on('DUES_UPDATED', (data) => handleIncomingRealtimeEvent('DUES_UPDATED', data, 'websocket'));
  socket.on('ADMIN_DUES_UPDATED', (data) => handleIncomingRealtimeEvent('ADMIN_DUES_UPDATED', data, 'websocket'));
  socket.on('PAYMENT_RECEIVED', (data) => handleIncomingRealtimeEvent('PAYMENT_RECEIVED', data, 'websocket'));
  socket.on('ADMIN_PAYMENT_RECEIVED', (data) => handleIncomingRealtimeEvent('ADMIN_PAYMENT_RECEIVED', data, 'websocket'));
  socket.on('NOTIFICATION_NEW', (data) => handleIncomingRealtimeEvent('NOTIFICATION_NEW', data, 'websocket'));

  return socket;
}

/**
 * Joins rooms based on current consumer or admin authentication
 */
export function syncRoomsWithCurrentAuth() {
  if (!socket || !socket.connected) return;

  const store = useStore.getState();

  // Consumer rooms
  const consumer = store.consumerSession?.consumer;
  if (consumer?.id) {
    socket.emit('join:consumer', consumer.id);
  }
  if (consumer?.mobile) {
    socket.emit('join:mobile', consumer.mobile);
  }

  // Admin stream
  if (store.adminSession?.token) {
    socket.emit('join:admin');
  }
}

/**
 * Broadcasts an event locally across browser tabs and triggers store updates immediately (0ms latency)
 */
export function broadcastLocalRealtimeEvent(type: string, payload: any) {
  // 1. Process locally in current tab
  handleIncomingRealtimeEvent(type, payload, 'local');

  // 2. Post to all other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload });
    } catch (e) {
      console.warn('[Realtime] Failed to broadcast across tabs:', e);
    }
  }
}

export function getSocket(): Socket | null {
  return socket;
}
