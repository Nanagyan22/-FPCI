const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const MonthlyReport = require('../models/MonthlyReport');
const WeeklyReport = require('../models/WeeklyReport');
const Branch = require('../models/Branch');
const moment = require('moment');

// GET Raw Data Table
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type = 'monthly', branch, year, month, status, page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (branch) filter.branch = branch;
    if (year) filter.year = Number(year);
    if (month) filter.month = Number(month);
    if (status) filter.status = status;

    let reports, total;

    if (type === 'weekly') {
      reports = await WeeklyReport.find(filter)
        .populate('branch', 'name code')
        .sort({ weeklyDate: -1 })
        .skip(skip)
        .limit(limit);
      total = await WeeklyReport.countDocuments(filter);
    } else {
      reports = await MonthlyReport.find(filter)
        .populate('branch', 'name code')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit);
      total = await MonthlyReport.countDocuments(filter);
    }

    const branches = await Branch.find({ isActive: true }).sort('name');
    const years = [];
    for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

    res.render('reports/index', {
      title: 'Reports Data - FPCI',
      reports,
      type,
      branches,
      years,
      filters: { branch, year, month, status },
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      },
      moment
    });
  } catch (error) {
    console.error('Reports error:', error);
    req.flash('error_msg', 'Error loading reports');
    res.redirect('/dashboard');
  }
});

// GET Single Report Detail
router.get('/view/:type/:id', requireAuth, async (req, res) => {
  try {
    let report;
    if (req.params.type === 'weekly') {
      report = await WeeklyReport.findById(req.params.id).populate('branch');
    } else {
      report = await MonthlyReport.findById(req.params.id).populate('branch');
    }
    if (!report) {
      req.flash('error_msg', 'Report not found');
      return res.redirect('/reports');
    }
    res.render('reports/view', {
      title: `Report ${report.reportId} - FPCI`,
      report,
      type: req.params.type,
      moment
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading report');
    res.redirect('/reports');
  }
});

// PUT Update Report Status
router.put('/:type/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, officeNotes } = req.body;
    const Model = req.params.type === 'weekly' ? WeeklyReport : MonthlyReport;
    await Model.findByIdAndUpdate(req.params.id, { status, officeNotes });
    req.flash('success_msg', `Report ${status} successfully`);
    res.redirect(`/reports/view/${req.params.type}/${req.params.id}`);
  } catch (error) {
    req.flash('error_msg', 'Error updating report status');
    res.redirect('/reports');
  }
});

module.exports = router;
