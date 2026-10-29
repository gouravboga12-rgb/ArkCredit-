require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akr_credit';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Consumer = mongoose.connection.collection('consumers');
  const Payment = mongoose.connection.collection('payments');
  const DuesPlan = mongoose.connection.collection('duesplans');
  const AppNotification = mongoose.connection.collection('appnotifications');
  const CardRequest = mongoose.connection.collection('cardrequests');
  const ActivityLog = mongoose.connection.collection('activitylogs');

  // 1. Consumers
  const dummyConsumerFilter = {
    $or: [
      { email: { $regex: /@example\.com$/i } },
      { id: { $in: ['c_rahul_4821', 'c_sneha_1092', 'c_priya_5512', 'c_amit_9823'] } }
    ]
  };
  const deletedConsumers = await Consumer.deleteMany(dummyConsumerFilter);
  console.log(`Deleted dummy consumers: ${deletedConsumers.deletedCount}`);

  // Remaining consumers
  const remainingConsumers = await Consumer.find({}).toArray();
  const validConsumerIds = remainingConsumers.map(c => c.id);
  console.log('Remaining real consumers:', remainingConsumers.map(c => ({ id: c.id, name: c.name, email: c.email })));

  // 2. Dues Plans: remove dummy plans or orphaned plans
  const dummyPlanFilter = {
    $or: [
      { id: { $in: ['plan_priya_1', 'plan_amit_1'] } },
      { consumerId: { $nin: validConsumerIds } }
    ]
  };
  const deletedPlans = await DuesPlan.deleteMany(dummyPlanFilter);
  console.log(`Deleted dummy/orphaned dues plans: ${deletedPlans.deletedCount}`);

  // 3. Payments: remove dummy payments or orphaned payments
  const dummyPaymentFilter = {
    $or: [
      { id: { $in: ['pay_priya_1', 'pay_mvme2fxj'] } },
      { consumerId: { $nin: validConsumerIds } }
    ]
  };
  const deletedPayments = await Payment.deleteMany(dummyPaymentFilter);
  console.log(`Deleted dummy/orphaned payments: ${deletedPayments.deletedCount}`);

  // 4. Notifications: remove dummy welcome notification
  const deletedNotifications = await AppNotification.deleteMany({
    $or: [
      { id: 'notif_welcome' },
      { consumerId: { $exists: true, $nin: [null, '', ...validConsumerIds] } }
    ]
  });
  console.log(`Deleted dummy notifications: ${deletedNotifications.deletedCount}`);

  // 5. Card Requests: remove dummy or orphaned card requests
  try {
    const deletedCardRequests = await CardRequest.deleteMany({
      $or: [
        { id: 'req_rahul_4821' },
        { email: { $regex: /@example\.com$/i } }
      ]
    });
    console.log(`Deleted dummy card requests: ${deletedCardRequests.deletedCount}`);
  } catch (e) {
    console.log('Card requests collection note:', e.message);
  }

  // 6. Activity logs: clean dummy init log
  try {
    const deletedLogs = await ActivityLog.deleteMany({
      id: 'log_init'
    });
    console.log(`Deleted dummy activity logs: ${deletedLogs.deletedCount}`);
  } catch (e) {
    console.log('Activity logs collection note:', e.message);
  }

  console.log('Database cleanup complete!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});

