require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyReport = require('./src/models/MonthlyReport');
const WeeklyReport  = require('./src/models/WeeklyReport');
const User          = require('./src/models/User');
const Branch        = require('./src/models/Branch');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const mr = await MonthlyReport.countDocuments();
  const wr = await WeeklyReport.countDocuments();
  const u  = await User.countDocuments();
  const b  = await Branch.countDocuments();

  console.log('==============================');
  console.log('📊 DATABASE CONTENTS');
  console.log('==============================');
  console.log('Monthly Reports:', mr);
  console.log('Weekly Reports: ', wr);
  console.log('Users:          ', u);
  console.log('Branches:       ', b);
  console.log('==============================');

  // Show sample of monthly reports to confirm they are test data
  const sample = await MonthlyReport.find().limit(3).select('reportId branchName month year preparedBy ipAddress');
  console.log('\nSample Monthly Reports:');
  sample.forEach(r => console.log(' -', r.reportId, '|', r.branchName, '|', r.month+'/'+r.year, '| IP:', r.ipAddress));

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
