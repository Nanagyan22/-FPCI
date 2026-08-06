const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const Pastor = require('../models/Pastor');
const MonthlyReport = require('../models/MonthlyReport');
const WeeklyReport = require('../models/WeeklyReport');

// GET Branch Pastors (for form autocomplete)
router.get('/branches/:id/pastors', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('pastors');
    res.json({ success: true, pastors: branch ? branch.pastors : [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET All Branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort('name').populate('pastors');
    res.json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Dashboard Data (for dynamic filtering)
router.get('/dashboard/data', async (req, res) => {
  try {
    const { year, month, branch } = req.query;
    const filter = {};
    if (year) filter.year = Number(year);
    if (month) filter.month = Number(month);
    if (branch) filter.branch = branch;

    const [monthlyReports, weeklyReports] = await Promise.all([
      MonthlyReport.find(filter).populate('branch', 'name code'),
      WeeklyReport.find(filter).populate('branch', 'name code')
    ]);

    res.json({ success: true, monthlyReports, weeklyReports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
