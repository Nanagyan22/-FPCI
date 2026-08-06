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

    // --- KPIs ---
    const [
      totalMonthlyReports,
      totalWeeklyReports,
      totalBranches,
      pendingReports,
      currentMonthData,
      prevMonthData
    ] = await Promise.all([
      MonthlyReport.countDocuments(),
      WeeklyReport.countDocuments(),
      Branch.countDocuments({ isActive: true }),
      MonthlyReport.countDocuments({ status: 'pending' }) + WeeklyReport.countDocuments({ status: 'pending' }),
      MonthlyReport.find({ year: currentYear, month: currentMonth }),
      MonthlyReport.find({ year: currentYear, month: currentMonth - 1 || 12 })
    ]);

    const totalAttendance = currentMonthData.reduce((sum, r) =>
      sum + (r.membership.male + r.membership.female + r.membership.children), 0);
    const totalIncome = currentMonthData.reduce((sum, r) => sum + r.income.total, 0);
    const totalSouls = currentMonthData.reduce((sum, r) => sum + r.membership.soulsAdded, 0);
    const totalExpenditure = currentMonthData.reduce((sum, r) => sum + r.expenditure.total, 0);
    const prevIncome = prevMonthData.reduce((sum, r) => sum + r.income.total, 0);
    const prevAttendance = prevMonthData.reduce((sum, r) =>
      sum + (r.membership.male + r.membership.female + r.membership.children), 0);

    // --- Branch Performance ---
    const branchPerformance = await MonthlyReport.aggregate([
      { $match: { year: currentYear } },
      { $group: {
        _id: '$branch',
        branchName: { $first: '$branchName' },
        totalIncome: { $sum: '$income.total' },
        totalExpenditure: { $sum: '$expenditure.total' },
        totalAttendance: { $sum: { $add: ['$membership.male', '$membership.female', '$membership.children'] } },
        totalSouls: { $sum: '$membership.soulsAdded' },
        reportCount: { $sum: 1 }
      }},
      { $sort: { totalIncome: -1 } }
    ]);

    // --- Monthly Trends (last 12 months) ---
    const monthlyTrends = await MonthlyReport.aggregate([
      { $match: { year: { $gte: currentYear - 1 } } },
      { $group: {
        _id: { year: '$year', month: '$month' },
        totalIncome: { $sum: '$income.total' },
        totalAttendance: { $sum: { $add: ['$membership.male', '$membership.female', '$membership.children'] } },
        totalSouls: { $sum: '$membership.soulsAdded' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // --- Income Breakdown (current year) ---
    const incomeBreakdown = await MonthlyReport.aggregate([
      { $match: { year: currentYear } },
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

    // --- Weekly Trends ---
    const weeklyTrends = await WeeklyReport.aggregate([
      { $match: { year: currentYear } },
      { $group: {
        _id: { week: '$weekNumber', year: '$year' },
        totalIncome: { $sum: '$finance.total' },
        totalAttendance: { $sum: '$attendance.totalMembership' }
      }},
      { $sort: { '_id.week': 1 } },
      { $limit: 12 }
    ]);

    // --- Attendance Breakdown ---
    const attendanceBreakdown = await MonthlyReport.aggregate([
      { $match: { year: currentYear } },
      { $group: {
        _id: null,
        male: { $sum: '$membership.male' },
        female: { $sum: '$membership.female' },
        children: { $sum: '$membership.children' },
        visitors: { $sum: '$membership.visitors' }
      }}
    ]);

    // Best branch calculations
    const bestFinanceBranch = branchPerformance[0] || null;
    const bestAttendanceBranch = [...branchPerformance].sort((a, b) => b.totalAttendance - a.totalAttendance)[0] || null;
    const bestSoulsBranch = [...branchPerformance].sort((a, b) => b.totalSouls - a.totalSouls)[0] || null;
    const overallBest = branchPerformance.map(b => ({
      ...b,
      score: (b.totalIncome * 0.4) + (b.totalAttendance * 0.3) + (b.totalSouls * 0.3)
    })).sort((a, b) => b.score - a.score)[0] || null;

    res.render('dashboard/index', {
      title: 'Dashboard - FPCI',
      branches,
      kpis: {
        totalMonthlyReports,
        totalWeeklyReports,
        totalBranches,
        pendingReports: await MonthlyReport.countDocuments({ status: 'pending' }) + await WeeklyReport.countDocuments({ status: 'pending' }),
        totalAttendance,
        totalIncome,
        totalSouls,
        totalExpenditure,
        incomeGrowth: prevIncome > 0 ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1) : 0,
        attendanceGrowth: prevAttendance > 0 ? (((totalAttendance - prevAttendance) / prevAttendance) * 100).toFixed(1) : 0,
        netSurplus: totalIncome - totalExpenditure
      },
      branchPerformance,
      monthlyTrends,
      weeklyTrends,
      incomeBreakdown: incomeBreakdown[0] || {},
      attendanceBreakdown: attendanceBreakdown[0] || {},
      bestBranches: { bestFinanceBranch, bestAttendanceBranch, bestSoulsBranch, overallBest },
      currentYear,
      currentMonth,
      moment
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.render('dashboard/index', {
      title: 'Dashboard - FPCI',
      branches: [],
      kpis: {},
      branchPerformance: [],
      monthlyTrends: [],
      weeklyTrends: [],
      incomeBreakdown: {},
      attendanceBreakdown: {},
      bestBranches: {},
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      moment
    });
  }
});

module.exports = router;
