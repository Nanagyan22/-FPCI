require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyReport = require('../models/MonthlyReport');
const WeeklyReport = require('../models/WeeklyReport');
const Branch = require('../models/Branch');

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const rand = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const randF = (min,max) => parseFloat((Math.random()*(max-min)+min).toFixed(2));

const profiles = {
  'Headquarters':      {i:2.5,a:2.0,s:1.8},
  'Accra Branch':      {i:2.0,a:1.8,s:1.5},
  'Koforidua Branch':  {i:1.6,a:1.5,s:1.4},
  'Cape Coast Branch': {i:1.4,a:1.3,s:1.2},
  'Takoradi Branch':   {i:1.3,a:1.2,s:1.1},
  'Kpone City Branch': {i:1.2,a:1.1,s:1.0},
  'Kpone B5 Branch':   {i:1.1,a:1.0,s:0.9},
  'Gbestile Branch':   {i:1.0,a:0.9,s:0.8},
  'Zenu Branch':       {i:0.9,a:0.9,s:0.8},
  'Newyork Branch':    {i:0.85,a:0.8,s:0.7},
  'Amosima Branch':    {i:0.8,a:0.75,s:0.7},
  'Mankessim Branch':  {i:0.75,a:0.7,s:0.6},
  'Swedru Branch':     {i:0.7,a:0.65,s:0.55},
};

const pastorNames = ['Apostle Francis Afful-Gyan','Pastor John Mensah','Reverend Emmanuel Asante',
  'Pastor Kwame Boateng','Pastor Grace Adjei','Bishop Peter Quansah','Evangelist Samuel Owusu'];
const staffNames  = ['Ama Serwaa','Kofi Adu','Abena Mensah','Kweku Asante','Akosua Boateng'];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected...');
  await MonthlyReport.deleteMany({});
  await WeeklyReport.deleteMany({});
  console.log('Cleared reports');

  const branches = await Branch.find({ isActive: true });
  if (!branches.length) { console.log('No branches! Run npm run seed first.'); process.exit(1); }

  const yr = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  let mc = 0, wc = 0;

  for (const branch of branches) {
    const p = profiles[branch.name] || {i:1,a:1,s:1};

    // Monthly
    for (let m = 1; m <= curMonth; m++) {
      const male = rand(Math.floor(30*p.a), Math.floor(80*p.a));
      const female = rand(Math.floor(40*p.a), Math.floor(100*p.a));
      const children = rand(Math.floor(10*p.a), Math.floor(40*p.a));
      const visitors = rand(Math.floor(5*p.a), Math.floor(25*p.a));
      const soulsAdded = rand(Math.floor(1*p.s), Math.floor(15*p.s));

      const tithes = randF(200*p.i, 800*p.i);
      const offerings = randF(150*p.i, 600*p.i);
      const membershipDues = randF(50*p.i, 200*p.i);
      const projectOffering = randF(30*p.i, 150*p.i);
      const childrenService = randF(20*p.i, 100*p.i);
      const seeds = randF(10*p.i, 80*p.i);
      const pledges = randF(20*p.i, 120*p.i);
      const revivalPrograms = randF(0, 200*p.i);
      const bank = randF(0, 100*p.i);
      const otherFunds = randF(10*p.i, 60*p.i);
      const lightChurchPremises = randF(30, 150);
      const pastorsAllowance = randF(100*p.i, 400*p.i);
      const otherExpenses = randF(20, 100);

      const reportId = `MR-${yr}${String(m).padStart(2,'0')}-${branch.code}-${Date.now().toString().slice(-4)}`;

      const doc = new MonthlyReport({
        reportId, month: m, year: yr, monthName: MONTHS[m-1],
        branch: branch._id, branchName: branch.name,
        membership: { male, female, children, visitors, soulsAdded },
        income: { tithes, offerings, membershipDues, projectOffering, childrenService, seeds, pledges, revivalPrograms, bank, otherFunds },
        expenditure: { lightChurchPremises, pastorsAllowance, otherExpenses },
        preparedBy: staffNames[rand(0, staffNames.length-1)],
        residentPastor: pastorNames[rand(0, pastorNames.length-1)],
        status: m < curMonth ? (Math.random()>0.3?'approved':'pending') : 'pending',
        submittedViaLink: Math.random()>0.5, ipAddress: '127.0.0.1'
      });
      await doc.save();
      mc++;
    }

    // Weekly (last 12 weeks)
    const today = new Date();
    for (let w = 0; w < 12; w++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - w * 7);
      const total = rand(Math.floor(60*p.a), Math.floor(160*p.a));
      const male = Math.floor(total*0.38);
      const female = Math.floor(total*0.42);
      const children = Math.floor(total*0.15);
      const visitors = Math.max(0, total - male - female - children);
      const days = ['Sunday','Wednesday'];
      if (Math.random()>0.4) days.push('Friday');
      if (Math.random()>0.6) days.push('Tuesday');

      const reportId = `WR-${yr}-W${52-w}-${branch.code}-${Date.now().toString().slice(-4)}`;

      const doc = new WeeklyReport({
        reportId, weeklyDate: weekDate,
        branch: branch._id, branchName: branch.name, daysOfService: days,
        attendance: { totalMembership: total, male, female, children, visitors },
        finance: {
          tithes: randF(50*p.i,200*p.i), offerings: randF(40*p.i,150*p.i),
          membershipDues: randF(10*p.i,50*p.i), projectOffering: randF(5*p.i,40*p.i),
          childrenService: randF(5*p.i,30*p.i), seeds: randF(0,30*p.i),
          pledges: randF(0,40*p.i), revivalPrograms: randF(0,60*p.i),
          bank: randF(0,30*p.i), otherFunds: randF(0,20*p.i)
        },
        preparedBy: staffNames[rand(0,staffNames.length-1)],
        residentPastor: pastorNames[rand(0,pastorNames.length-1)],
        status: w > 0 ? 'approved' : 'pending',
        submittedViaLink: Math.random()>0.6, ipAddress: '127.0.0.1'
      });
      await doc.save();
      wc++;
    }
    console.log(`✅ ${branch.name}: done`);
  }

  console.log('\n🎉 TEST DATA COMPLETE!');
  console.log(`📊 Monthly: ${mc}  |  📅 Weekly: ${wc}  |  🏛️ Branches: ${branches.length}`);
  console.log('Go to: http://localhost:3000/dashboard');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
