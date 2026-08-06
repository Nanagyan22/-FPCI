require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Pastor = require('../models/Pastor');

const branches = [
  { name: 'Headquarters', code: 'HQ', location: 'Accra', region: 'Greater Accra', isHeadquarters: true },
  { name: 'Gbestile Branch', code: 'GBS', location: 'Gbestile', region: 'Greater Accra' },
  { name: 'Newyork Branch', code: 'NYC', location: 'Newyork', region: 'Greater Accra' },
  { name: 'Zenu Branch', code: 'ZNU', location: 'Zenu', region: 'Greater Accra' },
  { name: 'Kpone B5 Branch', code: 'KPB5', location: 'Kpone B5', region: 'Greater Accra' },
  { name: 'Kpone City Branch', code: 'KPCY', location: 'Kpone City', region: 'Greater Accra' },
  { name: 'Accra Branch', code: 'ACC', location: 'Accra', region: 'Greater Accra' },
  { name: 'Koforidua Branch', code: 'KFD', location: 'Koforidua', region: 'Eastern Region' },
  { name: 'Mankessim Branch', code: 'MKS', location: 'Mankessim', region: 'Central Region' },
  { name: 'Swedru Branch', code: 'SWD', location: 'Swedru', region: 'Central Region' },
  { name: 'Takoradi Branch', code: 'TKD', location: 'Takoradi', region: 'Western Region' },
  { name: 'Cape Coast Branch', code: 'CPC', location: 'Cape Coast', region: 'Central Region' },
  { name: 'Amosima Branch', code: 'AMS', location: 'Amosima', region: 'Greater Accra' },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to database for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Branch.deleteMany({});
    await Pastor.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Branches
    const createdBranches = await Branch.insertMany(branches);
    console.log(`✅ Created ${createdBranches.length} branches`);

    // Create Pastors
    const pastors = [
      { firstName: 'Francis', lastName: 'Afful-Gyan', title: 'Apostle', isPrimaryPastor: true, branches: [createdBranches[0]._id] },
      { firstName: 'John', lastName: 'Mensah', title: 'Pastor', branches: [createdBranches[1]._id, createdBranches[2]._id] },
      { firstName: 'Emmanuel', lastName: 'Asante', title: 'Reverend', branches: [createdBranches[3]._id] },
      { firstName: 'Kwame', lastName: 'Boateng', title: 'Pastor', branches: [createdBranches[4]._id, createdBranches[5]._id] },
      { firstName: 'Samuel', lastName: 'Owusu', title: 'Evangelist', branches: [createdBranches[6]._id] },
      { firstName: 'Daniel', lastName: 'Acheampong', title: 'Pastor', branches: [createdBranches[7]._id] },
      { firstName: 'Grace', lastName: 'Adjei', title: 'Pastor', branches: [createdBranches[8]._id, createdBranches[9]._id] },
      { firstName: 'Peter', lastName: 'Quansah', title: 'Bishop', branches: [createdBranches[10]._id] },
      { firstName: 'Mary', lastName: 'Amponsah', title: 'Pastor', branches: [createdBranches[11]._id] },
      { firstName: 'Isaac', lastName: 'Tetteh', title: 'Deacon', branches: [createdBranches[12]._id] },
    ];

    const createdPastors = await Pastor.insertMany(pastors);
    console.log(`✅ Created ${createdPastors.length} pastors`);

    // Update branches with pastors
    for (const pastor of createdPastors) {
      for (const branchId of pastor.branches) {
        await Branch.findByIdAndUpdate(branchId, {
          $push: { pastors: pastor._id }
        });
      }
    }

    // Create Admin User
    const adminUser = await User.create({
      firstName: 'FPCI',
      lastName: 'Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@fpci.org',
      password: process.env.ADMIN_PASSWORD || 'FPCI@Admin2024',
      role: 'super_admin',
      isActive: true
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);
    console.log(`🔑 Admin Password: ${process.env.ADMIN_PASSWORD || 'FPCI@Admin2024'}`);

    // Create a test viewer user
    await User.create({
      firstName: 'Branch',
      lastName: 'Viewer',
      email: 'viewer@fpci.org',
      password: 'FPCI@Viewer2024',
      role: 'viewer',
      isActive: true
    });

    console.log('\n🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 ADMIN CREDENTIALS:');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@fpci.org'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'FPCI@Admin2024'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
