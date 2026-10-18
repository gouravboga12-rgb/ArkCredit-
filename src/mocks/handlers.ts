/**
 * Mock Service Worker (MSW) REST API Handlers
 * Intercepts /api/consumer/* and /api/admin/* fetch requests.
 * Uses realistic HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422).
 * Backed by the persisted Zustand store.
 */

import { http, HttpResponse, delay } from 'msw';
import { useStore } from '../store';
import {
  calculateTotalOutstanding,
  getEarliestNextEmi,
  determineDueStatus,
} from '../core/domain';

// Helper to extract bearer token
function getAuthHeader(request: Request): string | null {
  const auth = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

// Helper to simulate latency & optional network failure
async function handleMiddleware() {
  const state = useStore.getState();
  if (state.latencyMs) {
    await delay(state.latencyMs);
  }
  if (state.simulateNetworkError) {
    throw new Error('Network error simulated by dev switch');
  }
}

export const handlers = [
  // ==========================================
  // CONSUMER AUTH ENDPOINTS
  // ==========================================

  http.post('/api/consumer/auth/login', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as { identifier?: string; password?: string };
    const { identifier, password } = body;

    if (!identifier || !password) {
      return HttpResponse.json(
        { error: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim().toLowerCase();
    const state = useStore.getState();
    const consumer = state.consumers.find(
      (c) =>
        (c.email.toLowerCase() === cleanId ||
          c.mobile.trim() === cleanId ||
          c.accountNumber?.trim().toLowerCase() === cleanId ||
          c.id.toLowerCase() === cleanId) &&
        c.passwordHash === password
    );

    // Cross-login rule: do NOT reveal if it's an admin account
    if (!consumer) {
      return HttpResponse.json(
        { error: 'Invalid Account ID, email/mobile number, or password' },
        { status: 401 }
      );
    }

    if (consumer.status === 'inactive') {
      return HttpResponse.json(
        { error: 'Your account is inactive. Please contact AKR Credit Capital support.' },
        { status: 403 }
      );
    }

    const token = `mock_consumer_token_${consumer.id}`;
    const session = {
      userType: 'consumer' as const,
      token,
      consumer,
    };

    state.setConsumerSession(session);
    return HttpResponse.json(session, { status: 200 });
  }),

  http.post('/api/consumer/auth/google', async () => {
    await handleMiddleware();
    const state = useStore.getState();
    // Default mock login as lead demo consumer Rahul Sharma
    const leadConsumer = state.consumers.find((c) => c.id === 'c_rahul_4821') || state.consumers[0];

    const token = `mock_consumer_token_${leadConsumer.id}`;
    const session = {
      userType: 'consumer' as const,
      token,
      consumer: leadConsumer,
    };

    state.setConsumerSession(session);
    return HttpResponse.json(session, { status: 200 });
  }),

  http.post('/api/consumer/auth/signup', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as any;
    const { fullName, mobile, email, password, address } = body;

    const state = useStore.getState();
    // Duplicate checks
    if (state.consumers.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      return HttpResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }
    if (state.consumers.some((c) => c.mobile === mobile)) {
      return HttpResponse.json({ error: 'Mobile number is already registered' }, { status: 409 });
    }

    const randomAccSuffix = Math.floor(1000 + Math.random() * 9000);
    const newConsumer = state.addConsumer({
      name: fullName,
      mobile,
      email,
      address: address || '',
      accountNumber: `AKR1000${randomAccSuffix}`,
      status: 'active',
      passwordHash: password,
      notificationPreferences: {
        pushEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        emiReminders: true,
        promotionalOffers: true,
      },
    });

    const token = `mock_consumer_token_${newConsumer.id}`;
    const session = {
      userType: 'consumer' as const,
      token,
      consumer: newConsumer,
    };

    state.setConsumerSession(session);
    return HttpResponse.json(session, { status: 201 });
  }),

  http.post('/api/consumer/auth/forgot-password', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as { identifier?: string };
    const cleanId = (body.identifier || '').trim().toLowerCase();
    const state = useStore.getState();

    const exists = state.consumers.some(
      (c) => c.email.toLowerCase() === cleanId || c.mobile === cleanId
    );

    if (!exists) {
      return HttpResponse.json(
        { error: 'No consumer account found with this identifier' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'OTP sent successfully (hint: 123456)' });
  }),

  http.post('/api/consumer/auth/verify-otp', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as { otp?: string };
    if (!body.otp || body.otp.length !== 6) {
      return HttpResponse.json({ error: 'Please enter a valid 6-digit OTP' }, { status: 400 });
    }
    // Accept any 6 digit OTP for prototype demo
    return HttpResponse.json({ valid: true });
  }),

  http.post('/api/consumer/auth/reset-password', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as { identifier?: string; newPassword?: string };
    const { identifier, newPassword } = body;
    const cleanId = (identifier || '').trim().toLowerCase();
    const state = useStore.getState();

    const consumer = state.consumers.find(
      (c) => c.email.toLowerCase() === cleanId || c.mobile === cleanId
    );

    if (!consumer) {
      return HttpResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    state.updateConsumerProfile(consumer.id, { passwordHash: newPassword });
    return HttpResponse.json({ success: true, message: 'Password updated successfully' });
  }),

  // ==========================================
  // CONSUMER PROTECTED ENDPOINTS
  // ==========================================

  http.get('/api/consumer/profile', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const state = useStore.getState();
    const consumer = state.consumers.find((c) => c.id === consumerId);
    if (!consumer) {
      return HttpResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    return HttpResponse.json(consumer);
  }),

  http.put('/api/consumer/profile', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const body = (await request.json()) as any;
    // Permitted edits only: name, email, address, preferences
    const updates = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.address ? { address: body.address } : {}),
      ...(body.notificationPreferences ? { notificationPreferences: body.notificationPreferences } : {}),
    };

    const state = useStore.getState();
    const updated = state.updateConsumerProfile(consumerId, updates);
    return HttpResponse.json(updated);
  }),

  http.get('/api/consumer/dues', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const state = useStore.getState();

    const consumer = state.consumers.find((c) => c.id === consumerId);
    const plans = state.duesPlans.filter((p) => p.consumerId === consumerId && p.status === 'active');
    const allPlans = state.duesPlans.filter((p) => p.consumerId === consumerId);

    const totalOutstanding = calculateTotalOutstanding(plans);
    const nextEmi = getEarliestNextEmi(plans);
    const dueStatus = determineDueStatus(plans, consumer?.status === 'active');

    return HttpResponse.json({
      totalOutstanding,
      nextEmiAmount: nextEmi.amount,
      nextEmiDate: nextEmi.dueDate,
      isDueSoon: nextEmi.isDueSoon,
      dueStatus,
      plans,
      allPlans, // includes closed plans for full EMI schedule view
    });
  }),

  http.post('/api/consumer/payments/initiate', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const body = (await request.json()) as {
      planId: string | 'all';
      amount: number;
      mode: any;
      simulateFailure?: boolean;
    };

    if (body.simulateFailure) {
      return HttpResponse.json(
        {
          success: false,
          status: 'failed',
          message: 'Payment simulation failed by user request.',
        },
        { status: 400 }
      );
    }

    const state = useStore.getState();
    const result = state.executePayment(
      consumerId,
      body.planId,
      body.amount,
      body.mode || 'UPI',
      'online'
    );

    return HttpResponse.json(result, { status: 201 });
  }),

  http.get('/api/consumer/payments', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const state = useStore.getState();
    const payments = state.payments.filter((p) => p.consumerId === consumerId);

    return HttpResponse.json(payments);
  }),

  http.get('/api/consumer/cards', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const state = useStore.getState();
    // Disabled card types MUST be hidden from consumer app
    const enabledCards = state.cardTypes.filter((c) => c.enabled);
    return HttpResponse.json(enabledCards);
  }),

  http.get('/api/consumer/notifications', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consumerId = token.replace('mock_consumer_token_', '');
    const state = useStore.getState();
    const notifs = state.notifications.filter(
      (n) => n.consumerId === consumerId || n.consumerId === null
    );
    return HttpResponse.json(notifs);
  }),

  http.put('/api/consumer/notifications/:id/read', async ({ params }) => {
    await handleMiddleware();
    const { id } = params;
    useStore.getState().markNotificationAsRead(id as string);
    return HttpResponse.json({ success: true });
  }),

  http.put('/api/consumer/notifications/read-all', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_consumer_token_')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const consumerId = token.replace('mock_consumer_token_', '');
    useStore.getState().markAllNotificationsAsRead(consumerId);
    return HttpResponse.json({ success: true });
  }),

  // ==========================================
  // ADMIN AUTH ENDPOINTS
  // ==========================================

  http.post('/api/admin/auth/login', async ({ request }) => {
    await handleMiddleware();
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    const state = useStore.getState();
    const admin = state.adminUsers.find(
      (a) => a.email.toLowerCase() === (email || '').trim().toLowerCase()
    );

    // Cross-login check: consumer credentials fail with normal error
    if (!admin) {
      return HttpResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const isMatch =
      (admin.role === 'super_admin' && password === 'Admin@123') ||
      (admin.role === 'staff' && password === 'Staff@123');

    if (!isMatch) {
      return HttpResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = `mock_admin_token_${admin.id}_${admin.role}`;
    const session = {
      userType: 'admin' as const,
      role: admin.role,
      token,
      admin,
    };

    state.setAdminSession(session);
    return HttpResponse.json(session, { status: 200 });
  }),

  // ==========================================
  // ADMIN PROTECTED ENDPOINTS (Strict 403 on consumer tokens)
  // ==========================================

  http.get('/api/admin/dashboard', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Admin access forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    const totalConsumers = state.consumers.length;
    const activeConsumers = state.consumers.filter((c) => c.status === 'active').length;
    const totalOutstanding = state.duesPlans
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + p.outstandingAmount, 0);

    const totalCollected = state.payments
      .filter((p) => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0);

    // Upcoming EMIs (next 7 days)
    const upcomingPlans = state.duesPlans.filter(
      (p) => p.status === 'active' && p.outstandingAmount > 0 && p.nextEmiDate
    );

    return HttpResponse.json({
      totalConsumers,
      activeConsumers,
      totalOutstanding,
      totalCollected,
      upcomingPlansCount: upcomingPlans.length,
    });
  }),

  http.get('/api/admin/consumers', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Admin access forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    // Return consumers enriched with their dues summary
    const enriched = state.consumers.map((c) => {
      const plans = state.duesPlans.filter((p) => p.consumerId === c.id && p.status === 'active');
      const totalOutstanding = calculateTotalOutstanding(plans);
      const nextEmi = getEarliestNextEmi(plans);
      const dueStatus = determineDueStatus(plans, c.status === 'active');
      return {
        ...c,
        activePlansCount: plans.length,
        totalOutstanding,
        nextEmiAmount: nextEmi.amount,
        nextEmiDate: nextEmi.dueDate,
        dueStatus,
      };
    });

    return HttpResponse.json(enriched);
  }),

  http.post('/api/admin/consumers', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as any;
    const state = useStore.getState();

    // Duplicate checks
    if (state.consumers.some((c) => c.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json({ error: 'A consumer with this email already exists' }, { status: 409 });
    }
    if (state.consumers.some((c) => c.mobile === body.mobile)) {
      return HttpResponse.json({ error: 'A consumer with this mobile number already exists' }, { status: 409 });
    }
    if (state.consumers.some((c) => c.accountNumber === body.accountNumber)) {
      return HttpResponse.json({ error: 'Account number is already assigned' }, { status: 409 });
    }

    const adminName = state.adminSession?.admin.name || 'Admin';
    const newConsumer = state.addConsumer({
      name: body.name,
      mobile: body.mobile,
      email: body.email,
      address: body.address,
      accountNumber: body.accountNumber,
      status: body.status || 'active',
      passwordHash: body.password || body.passwordHash || 'Demo@123',
    });

    state.logActivity({
      adminUser: adminName,
      action: 'CREATE_CONSUMER',
      consumerId: newConsumer.id,
      consumerName: newConsumer.name,
      oldValue: '-',
      newValue: `${newConsumer.name} (${newConsumer.accountNumber})`,
    });

    return HttpResponse.json(newConsumer, { status: 201 });
  }),

  http.put('/api/admin/consumers/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const updates = { ...body };
    if (body.password) {
      updates.passwordHash = body.password;
      delete updates.password;
    }

    const updated = state.updateConsumerByAdmin(id as string, updates, adminName);
    if (!updated) {
      return HttpResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete('/api/admin/consumers/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role check: Only super_admin can delete consumers
    if (!token.includes('_super_admin')) {
      return HttpResponse.json(
        { error: 'Permission denied: Super Admin role required to delete consumers' },
        { status: 403 }
      );
    }

    const { id } = params;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const deleted = state.deleteConsumerByAdmin(id as string, adminName);
    if (!deleted) {
      return HttpResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/admin/consumers/:id/dues', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const state = useStore.getState();
    const plans = state.duesPlans.filter((p) => p.consumerId === id);
    return HttpResponse.json(plans);
  }),

  http.post('/api/admin/dues', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    // Breakdown arithmetic validation: outstanding = principal + interest + processingFee
    const calculatedOutstanding =
      Number(body.principal || 0) + Number(body.interest || 0) + Number(body.processingFee || 0);

    const newPlan = state.addDuesPlan(
      {
        consumerId: body.consumerId,
        planTypeId: body.planTypeId,
        title: body.title,
        referenceNumber: body.referenceNumber,
        status: calculatedOutstanding === 0 ? 'closed' : 'active',
        outstandingAmount: calculatedOutstanding,
        totalPaymentDue: calculatedOutstanding,
        principal: Number(body.principal || 0),
        interest: Number(body.interest || 0),
        processingFee: Number(body.processingFee || 0),
        emiAmount: Number(body.emiAmount || 0),
        nextEmiDate: body.nextEmiDate,
        totalEmis: Number(body.totalEmis || 1),
        remainingEmis: Number(body.remainingEmis || 1),
        tenureMonths: Number(body.tenureMonths || 1),
        linkedCardTypeId: body.linkedCardTypeId,
      },
      adminName
    );

    return HttpResponse.json(newPlan, { status: 201 });
  }),

  http.put('/api/admin/dues/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const calculatedOutstanding =
      body.principal !== undefined || body.interest !== undefined || body.processingFee !== undefined
        ? Number(body.principal || 0) + Number(body.interest || 0) + Number(body.processingFee || 0)
        : undefined;

    const updates = {
      ...body,
      ...(calculatedOutstanding !== undefined
        ? {
            outstandingAmount: calculatedOutstanding,
            status: calculatedOutstanding === 0 ? 'closed' : 'active',
          }
        : {}),
    };

    const updated = state.updateDuesPlan(id as string, updates, adminName);
    if (!updated) {
      return HttpResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete('/api/admin/dues/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role check: Only super_admin can delete dues plans
    if (!token.includes('_super_admin')) {
      return HttpResponse.json(
        { error: 'Permission denied: Super Admin role required to delete dues plans' },
        { status: 403 }
      );
    }

    const { id } = params;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const deleted = state.deleteDuesPlan(id as string, adminName);
    if (!deleted) {
      return HttpResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return HttpResponse.json({ success: true });
  }),

  http.post('/api/admin/dues/bulk', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { rows: any[] };
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const result = state.bulkUpsertDuesPlans(body.rows, adminName);
    return HttpResponse.json(result);
  }),

  http.get('/api/admin/plan-types', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    return HttpResponse.json(state.planTypes);
  }),

  http.post('/api/admin/plan-types', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const newPt = state.addPlanType(body, adminName);
    return HttpResponse.json(newPt, { status: 201 });
  }),

  http.put('/api/admin/plan-types/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const updated = state.updatePlanType(id as string, body, adminName);
    if (!updated) {
      return HttpResponse.json({ error: 'Plan type not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.get('/api/admin/payments', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    // Enrich payments with consumer details and plan titles
    const enriched = state.payments.map((p) => {
      const consumer = state.consumers.find((c) => c.id === p.consumerId);
      const plan = state.duesPlans.find((dp) => dp.id === p.planId);
      const planType = state.planTypes.find((pt) => pt.id === p.planTypeId);
      return {
        ...p,
        consumerName: consumer?.name || 'Unknown Consumer',
        consumerAccount: consumer?.accountNumber || '-',
        planTitle: plan?.title || planType?.name || 'Dues Payment',
        planTypeName: planType?.name || 'General',
      };
    });

    return HttpResponse.json(enriched);
  }),

  http.post('/api/admin/payments/offline', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      consumerId: string;
      planId: string;
      amount: number;
      mode: any;
      reference: string;
      date: string;
    };

    const state = useStore.getState();
    const result = state.executePayment(
      body.consumerId,
      body.planId,
      body.amount,
      body.mode,
      'offline',
      body.reference
    );

    return HttpResponse.json(result, { status: 201 });
  }),

  http.get('/api/admin/cards', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    return HttpResponse.json(state.cardTypes);
  }),

  http.post('/api/admin/cards', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const newCard = state.addCardType(body, adminName);
    return HttpResponse.json(newCard, { status: 201 });
  }),

  http.put('/api/admin/cards/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const updated = state.updateCardType(id as string, body, adminName);
    if (!updated) {
      return HttpResponse.json({ error: 'Card type not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete('/api/admin/cards/:id', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!token.includes('_super_admin')) {
      return HttpResponse.json(
        { error: 'Permission denied: Super Admin role required to delete card types' },
        { status: 403 }
      );
    }

    const { id } = params;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const deleted = state.deleteCardType(id as string, adminName);
    if (!deleted) {
      return HttpResponse.json({ error: 'Card type not found' }, { status: 404 });
    }

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/admin/notifications', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    return HttpResponse.json(state.notifications);
  }),

  http.post('/api/admin/notifications', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as any;
    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const newNotif = state.sendNotification({
      consumerId: body.consumerId || null,
      title: body.title,
      message: body.message,
      type: body.type || 'general',
    });

    state.logActivity({
      adminUser: adminName,
      action: 'DISPATCH_NOTIFICATION',
      consumerId: body.consumerId || '-',
      consumerName: body.consumerId ? 'Single Consumer' : 'All Consumers (Broadcast)',
      oldValue: '-',
      newValue: `${body.title}: ${body.message}`,
    });

    return HttpResponse.json(newNotif, { status: 201 });
  }),

  http.get('/api/admin/activity-log', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role check: activity log is super_admin view only
    if (!token.includes('_super_admin')) {
      return HttpResponse.json(
        { error: 'Permission denied: Super Admin role required to view audit activity log' },
        { status: 403 }
      );
    }

    const state = useStore.getState();
    return HttpResponse.json(state.activityLogs);
  }),

  // ==========================================
  // CARD REQUESTS (INQUIRE NOW / APPLY)
  // ==========================================

  http.post('/api/consumer/cards/apply', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    let consumerId: string | undefined;
    if (token && token.startsWith('mock_consumer_token_')) {
      consumerId = token.replace('mock_consumer_token_', '');
    }

    const body = (await request.json()) as any;
    if (!body.fullName || !body.phone || !body.panNumber || !body.aadharNumber || !body.address) {
      return HttpResponse.json(
        { error: 'All basic KYC details (Full Name, Phone, Address, PAN, Aadhaar) are required' },
        { status: 400 }
      );
    }

    const state = useStore.getState();
    const newReq = state.addCardRequest({
      consumerId: consumerId || body.consumerId,
      cardTypeId: body.cardTypeId || 'card_gold',
      cardTypeName: body.cardTypeName || 'AKR Gold Card',
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      panNumber: body.panNumber.toUpperCase(),
      aadharNumber: body.aadharNumber,
      panDocName: body.panDocName,
      panDocData: body.panDocData,
      monthlyIncome: body.monthlyIncome ? Number(body.monthlyIncome) : undefined,
    });

    return HttpResponse.json(newReq, { status: 201 });
  }),

  http.get('/api/admin/card-requests', async ({ request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = useStore.getState();
    return HttpResponse.json(state.cardRequests);
  }),

  http.put('/api/admin/card-requests/:id/status', async ({ params, request }) => {
    await handleMiddleware();
    const token = getAuthHeader(request);
    if (!token || !token.startsWith('mock_admin_token_')) {
      return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = (await request.json()) as {
      status: 'approved' | 'rejected';
      remarks?: string;
      creditLimit?: number;
    };

    const state = useStore.getState();
    const adminName = state.adminSession?.admin.name || 'Admin';

    const updated = state.updateCardRequestStatus(
      id as string,
      body.status,
      adminName,
      body.remarks,
      body.creditLimit
    );

    if (!updated) {
      return HttpResponse.json({ error: 'Card request not found' }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),
];
