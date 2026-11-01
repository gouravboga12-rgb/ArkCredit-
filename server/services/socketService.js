const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    path: '/api/socket.io',
    transports: ['websocket'], // Pure WebSocket: zero HTTP long-polling overhead, zero EC2 load
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    // Consumer joins room by consumerId
    socket.on('join:consumer', (consumerId) => {
      if (consumerId) {
        socket.join(`consumer:${consumerId}`);
      }
    });

    // Consumer joins room by mobile
    socket.on('join:mobile', (mobile) => {
      if (mobile) {
        socket.join(`mobile:${mobile}`);
      }
    });

    // Admin joins the admin stream
    socket.on('join:admin', () => {
      socket.join('admin_channel');
    });

    socket.on('disconnect', () => {
      // Clean disconnect, zero memory leaks
    });
  });

  console.log('[Socket.IO] Real-time engine initialized with pure WebSocket transport');
  return io;
}

function getIO() {
  return io;
}

// Broadcaster: When a consumer's credit limit, card approval, or details are updated
function emitConsumerUpdated(consumer) {
  if (!io || !consumer) return;
  const payload = {
    consumerId: consumer.id,
    mobile: consumer.mobile,
    creditLimit: consumer.creditLimit !== undefined ? Number(consumer.creditLimit) : 50000,
    cardApproved: consumer.cardApproved,
    cardStatus: consumer.cardStatus,
    status: consumer.status,
    timestamp: new Date().toISOString(),
  };

  // Push to consumer's personal rooms
  if (consumer.id) {
    io.to(`consumer:${consumer.id}`).emit('CONSUMER_UPDATED', payload);
  }
  if (consumer.mobile) {
    io.to(`mobile:${consumer.mobile}`).emit('CONSUMER_UPDATED', payload);
  }

  // Push to admin stream so other admin tabs/devices refresh immediately
  io.to('admin_channel').emit('ADMIN_CONSUMER_UPDATED', payload);
}

// Broadcaster: When an EMI plan is assigned, edited, or marked paid
function emitDuesUpdated(consumerId, data = {}) {
  if (!io || !consumerId) return;
  const payload = {
    consumerId,
    ...data,
    timestamp: new Date().toISOString(),
  };

  io.to(`consumer:${consumerId}`).emit('DUES_UPDATED', payload);
  io.to('admin_channel').emit('ADMIN_DUES_UPDATED', payload);
}

// Broadcaster: When a payment is recorded or verified via Razorpay
function emitPaymentRecorded(payment) {
  if (!io || !payment) return;
  const payload = {
    paymentId: payment.id,
    consumerId: payment.consumerId,
    amount: payment.amount,
    reference: payment.reference || payment.transactionRef,
    status: payment.status,
    timestamp: new Date().toISOString(),
  };

  if (payment.consumerId) {
    io.to(`consumer:${payment.consumerId}`).emit('PAYMENT_RECEIVED', payload);
  }
  io.to('admin_channel').emit('ADMIN_PAYMENT_RECEIVED', payload);
}

// Broadcaster: When a notification is generated
function emitNotification(consumerId, notif) {
  if (!io) return;
  const payload = {
    id: notif.id,
    consumerId,
    title: notif.title,
    message: notif.message,
    timestamp: new Date().toISOString(),
  };

  if (consumerId) {
    io.to(`consumer:${consumerId}`).emit('NOTIFICATION_NEW', payload);
  }
  io.to('admin_channel').emit('ADMIN_NOTIFICATION_NEW', payload);
}

module.exports = {
  initSocket,
  getIO,
  emitConsumerUpdated,
  emitDuesUpdated,
  emitPaymentRecorded,
  emitNotification,
};
