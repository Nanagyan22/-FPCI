require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyReport = require('./src/models/MonthlyReport');
const WeeklyReport  = require('./src/models/WeeklyReport');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('🗑️  Deleting all test reports...');

  const mr = await MonthlyReport.deleteMany({});
  const wr = await WeeklyReport.deleteMany({});

  console.log('✅ Deleted', mr.deletedCount, 'monthly reports');
  console.log('✅ Deleted', wr.deletedCount, 'weekly reports');
  console.log('\n🎉 Database is clean and ready for real data!');
  console.log('   Branches and users are kept intact.');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
