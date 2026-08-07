const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const MonthlyReport = require('../models/MonthlyReport');
const WeeklyReport = require('../models/WeeklyReport');
const Branch = require('../models/Branch');
const moment = require('moment');

router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort('name');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Read filters from query
    const filterYear   = parseInt(req.query.year)   || currentYear;
    const filterMonth  = parseInt(req.query.month)  || 0;
    const filterBranch = req.query.branch || '';

    // Build filter object
    const mFilter = { year: filterYear };
    const wFilter = { year: filterYear };
    if (filterMonth > 0) { mFilter.month = filterMonth; wFilter.month = filterMonth; }
    if (filterBranch)    { mFilter.branch = filterBranch; wFilter.branch = filterBranch; }

    // Previous period filter
    const prevFilter = { year: filterYear };
    if (filterMonth > 1) prevFilter.month = filterMonth - 1;
    else if (filterMonth === 1) { prevFilter.year = filterYear - 1; prevFilter.month = 12; }
    else prevFilter.month = currentMonth - 1 > 0 ? currentMonth - 1 : 12;
    if (filterBranch) prevFilter.branch = filterBranch;

    const [
      currentMonthData, prevMonthData,
      totalMonthlyReports, totalWeeklyReports,
      totalBranchesCount, pendingMonthly, pendingWeekly
    ] = await Promise.all([
      MonthlyReport.find(mFilter),
      MonthlyReport.find(prevFilter),
      MonthlyReport.countDocuments(),
      WeeklyReport.countDocuments(),
      Branch.countDocuments({ isActive: true }),
      MonthlyReport.countDocuments({ status: 'pending' }),
      WeeklyReport.countDocuments({ status: 'pending' })
    ]);

    const totalAttendance   = currentMonthData.reduce((s,r) => s+(r.membership.male+r.membership.female+r.membership.children),0);
    const totalIncome       = currentMonthData.reduce((s,r) => s+r.income.total, 0);
    const totalSouls        = currentMonthData.reduce((s,r) => s+r.membership.soulsAdded, 0);
    const totalExpenditure  = currentMonthData.reduce((s,r) => s+r.expenditure.total, 0);
    const prevIncome        = prevMonthData.reduce((s,r) => s+r.income.total, 0);
    const prevAttendance    = prevMonthData.reduce((s,r) => s+(r.membership.male+r.membership.female+r.membership.children),0);
    const incomeGrowth      = prevIncome > 0 ? (((totalIncome-prevIncome)/prevIncome)*100).toFixed(1) : 0;
    const attendanceGrowth  = prevAttendance > 0 ? (((totalAttendance-prevAttendance)/prevAttendance)*100).toFixed(1) : 0;

    // Branch performance
    const branchPerformance = await MonthlyReport.aggregate([
      { $match: { year: filterYear, ...(filterBranch && { branch: require('mongoose').Types.ObjectId.isValid(filterBranch) ? new (require('mongoose').Types.ObjectId)(filterBranch) : null }) } },
      { $group: {
        _id: '$branch',
        branchName: { $first: '$branchName' },
        totalIncome: { $sum: '$income.total' },
        totalExpenditure: { $sum: '$expenditure.total' },
        totalAttendance: { $sum: { $add: ['$membership.male','$membership.female','$membership.children'] } },
        totalSouls: { $sum: '$membership.soulsAdded' },
        reportCount: { $sum: 1 }
      }},
      { $sort: { totalIncome: -1 } }
    ]);

    // Monthly trends (12 months)
    const monthlyTrends = await MonthlyReport.aggregate([
      { $match: { year: filterYear, ...(filterBranch && {}) } },
      { $group: {
        _id: { year:'$year', month:'$month' },
        totalIncome: { $sum: '$income.total' },
        totalAttendance: { $sum: { $add: ['$membership.male','$membership.female','$membership.children'] } },
        totalSouls: { $sum: '$membership.soulsAdded' },
        totalExpenditure: { $sum: '$expenditure.total' }
      }},
      { $sort: { '_id.year':1, '_id.month':1 } }
    ]);

    // Weekly trends
    const weeklyTrends = await WeeklyReport.aggregate([
      { $match: { year: filterYear } },
      { $group: {
        _id: { week:'$weekNumber', year:'$year' },
        totalIncome: { $sum: '$finance.total' },
        totalAttendance: { $sum: '$attendance.totalMembership' }
      }},
      { $sort: { '_id.week':1 } },
      { $limit: 16 }
    ]);

    // Income breakdown
    const incomeBreakdown = await MonthlyReport.aggregate([
      { $match: mFilter },
      { $group: {
        _id: null,
        tithes: { $sum: '$income.tithes' },
        offerings: { $sum: '$income.offerings' },
        membershipDues: { $sum: '$income.membershipDues' },
        projectOffering: { $sum: '$income.projectOffering' },
        childrenService: { $sum: '$income.childrenService' },
        seeds: { $sum: '$income.seeds' },
        pledges: { $sum: '$income.pledges' },
        revivalPrograms: { $sum: '$income.revivalPrograms' },
        bank: { $sum: '$income.bank' },
        otherFunds: { $sum: '$income.otherFunds' }
      }}
    ]);

    // Attendance breakdown
    const attendanceBreakdown = await MonthlyReport.aggregate([
      { $match: mFilter },
      { $group: {
        _id: null,
        male: { $sum: '$membership.male' },
        female: { $sum: '$membership.female' },
        children: { $sum: '$membership.children' },
        visitors: { $sum: '$membership.visitors' }
      }}
    ]);

    const bestFinanceBranch    = branchPerformance[0] || null;
    const bestAttendanceBranch = [...branchPerformance].sort((a,b)=>b.totalAttendance-a.totalAttendance)[0]||null;
    const bestSoulsBranch      = [...branchPerformance].sort((a,b)=>b.totalSouls-a.totalSouls)[0]||null;
    const overallBest          = branchPerformance.map(b=>({...b,score:(b.totalIncome*0.4)+(b.totalAttendance*0.3)+(b.totalSouls*0.3)})).sort((a,b)=>b.score-a.score)[0]||null;

    res.render('dashboard/index', {
      title: 'Dashboard - FPCI', branches, moment,
      currentYear, currentMonth, filterYear, filterMonth, filterBranch,
      kpis: {
        totalMonthlyReports, totalWeeklyReports,
        totalBranches: totalBranchesCount,
        pendingReports: pendingMonthly + pendingWeekly,
        totalAttendance, totalIncome, totalSouls, totalExpenditure,
        incomeGrowth, attendanceGrowth,
        netSurplus: totalIncome - totalExpenditure,
        prevIncome, prevAttendance
      },
      branchPerformance, monthlyTrends, weeklyTrends,
      incomeBreakdown: incomeBreakdown[0] || {},
      attendanceBreakdown: attendanceBreakdown[0] || {},
      bestBranches: { bestFinanceBranch, bestAttendanceBranch, bestSoulsBranch, overallBest }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard: ' + error.message);
    res.redirect('/auth/login');
  }
});

module.exports = router;
