const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Branch = require('../models/Branch');
const Pastor = require('../models/Pastor');
const WeeklyReport = require('../models/WeeklyReport');
const MonthlyReport = require('../models/MonthlyReport');
const FormLink = require('../models/FormLink');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

// GET Main Form Page
router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort('name').populate('pastors');
    const pastors = await Pastor.find({ isActive: true }).sort('lastName').populate('branches');
    res.render('forms/index', {
      title: 'Submit Report - FPCI',
      branches, pastors,
      activeTab: req.query.tab || 'weekly',
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Forms error:', error);
    req.flash('error_msg', 'Error loading form');
    res.redirect('/dashboard');
  }
});

// GET Public Form via Link
router.get('/submit/:token', async (req, res) => {
  try {
    const formLink = await FormLink.findOne({
      token: req.params.token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('branch');

    if (!formLink) {
      return res.render('forms/expired', { title: 'Link Expired - FPCI' });
    }

    const branches = await Branch.find({ isActive: true }).sort('name').populate('pastors');
    const pastors = await Pastor.find({ isActive: true }).sort('lastName').populate('branches');

    res.render('forms/public', {
      title: 'Submit Report - FPCI',
      formLink, branches, pastors,
      activeTab: formLink.formType === 'monthly' ? 'monthly' : 'weekly'
    });
  } catch (error) {
    console.error('Public form error:', error);
    res.render('forms/expired', { title: 'Error - FPCI' });
  }
});

// POST Weekly Report
router.post('/weekly', async (req, res) => {
  try {
    const {
      weeklyDate, branch, daysOfService,
      totalMembership, male, female, children, visitors,
      tithes, offerings, membershipDues, projectOffering,
      childrenService, seeds, pledges, revivalPrograms, bank, otherFunds,
      preparedBy, preparedBySignature, residentPastor, residentPastorSignature,
      token,
      customFinanceLabels, customFinanceAmounts
    } = req.body;

    const branchDoc = await Branch.findById(branch);
    if (!branchDoc) {
      if (req.session.user) { req.flash('error_msg', 'Branch not found'); return res.redirect('/forms?tab=weekly'); }
      return res.status(400).send('Branch not found');
    }

    // Build custom finance fields
    const customFields = [];
    if (customFinanceLabels) {
      const labels = Array.isArray(customFinanceLabels) ? customFinanceLabels : [customFinanceLabels];
      const amounts = Array.isArray(customFinanceAmounts) ? customFinanceAmounts : [customFinanceAmounts];
      labels.forEach((label, i) => {
        if (label && label.trim()) {
          customFields.push({ label: label.trim(), amount: parseFloat(amounts[i]) || 0 });
        }
      });
    }

    const reportId = `WR-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const report = new WeeklyReport({
      reportId,
      weeklyDate: new Date(weeklyDate),
      branch: branchDoc._id,
      branchName: branchDoc.name,
      daysOfService: Array.isArray(daysOfService) ? daysOfService : [daysOfService].filter(Boolean),
      attendance: {
        totalMembership: Number(totalMembership)||0,
        male: Number(male)||0, female: Number(female)||0,
        children: Number(children)||0, visitors: Number(visitors)||0
      },
      finance: {
        tithes: Number(tithes)||0, offerings: Number(offerings)||0,
        membershipDues: Number(membershipDues)||0, projectOffering: Number(projectOffering)||0,
        childrenService: Number(childrenService)||0, seeds: Number(seeds)||0,
        pledges: Number(pledges)||0, revivalPrograms: Number(revivalPrograms)||0,
        bank: Number(bank)||0, otherFunds: Number(otherFunds)||0,
        customFields
      },
      preparedBy: preparedBy || 'Unknown',
      preparedBySignature: preparedBySignature || '',
      residentPastor: residentPastor || 'Unknown',
      residentPastorSignature: residentPastorSignature || '',
      submittedViaLink: !!token,
      ipAddress: req.ip
    });

    await report.save();

    if (token) await FormLink.findOneAndUpdate({ token }, { $inc: { usageCount: 1 } });

    if (req.session.user) {
      req.flash('success_msg', '✅ Weekly report submitted successfully! Report ID: ' + report.reportId);
      return res.redirect('/forms?tab=weekly');
    }
    res.render('forms/success', { title: 'Submitted - FPCI', reportType: 'Weekly', reportId: report.reportId });
  } catch (error) {
    console.error('Weekly report submission error:', error);
    if (req.session.user) {
      req.flash('error_msg', 'Submission failed: ' + error.message);
      return res.redirect('/forms?tab=weekly');
    }
    res.status(500).render('partials/error', { title: 'Error', error: error });
  }
});

// POST Monthly Report
router.post('/monthly', async (req, res) => {
  try {
    const {
      month, year, branch,
      membershipMale, membershipFemale, membershipChildren, membershipVisitors, soulsAdded,
      tithes, offerings, membershipDues, projectOffering, childrenService,
      seeds, pledges, revivalPrograms, bank, otherFunds,
      lightChurchPremises, pastorsAllowance, otherExpenses,
      preparedBy, preparedBySignature, residentPastor, residentPastorSignature,
      token,
      customIncomeLabels, customIncomeAmounts,
      customExpenseLabels, customExpenseAmounts
    } = req.body;

    const branchDoc = await Branch.findById(branch);
    if (!branchDoc) {
      if (req.session.user) { req.flash('error_msg', 'Branch not found'); return res.redirect('/forms?tab=monthly'); }
      return res.status(400).send('Branch not found');
    }

    const monthNum = Number(month);
    if (!monthNum || monthNum < 1 || monthNum > 12) {
      if (req.session.user) { req.flash('error_msg', 'Please select a valid month'); return res.redirect('/forms?tab=monthly'); }
      return res.status(400).send('Invalid month');
    }

    // Build custom income fields
    const customIncomeFields = [];
    if (customIncomeLabels) {
      const labels = Array.isArray(customIncomeLabels) ? customIncomeLabels : [customIncomeLabels];
      const amounts = Array.isArray(customIncomeAmounts) ? customIncomeAmounts : [customIncomeAmounts];
      labels.forEach((label, i) => {
        if (label && label.trim()) customIncomeFields.push({ label: label.trim(), amount: parseFloat(amounts[i]) || 0 });
      });
    }

    // Build custom expense fields
    const customExpenseFields = [];
    if (customExpenseLabels) {
      const labels = Array.isArray(customExpenseLabels) ? customExpenseLabels : [customExpenseLabels];
      const amounts = Array.isArray(customExpenseAmounts) ? customExpenseAmounts : [customExpenseAmounts];
      labels.forEach((label, i) => {
        if (label && label.trim()) customExpenseFields.push({ label: label.trim(), amount: parseFloat(amounts[i]) || 0 });
      });
    }

    const reportYear = Number(year) || new Date().getFullYear();
    const reportId = `MR-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const report = new MonthlyReport({
      reportId,
      month: monthNum,
      year: reportYear,
      branch: branchDoc._id,
      branchName: branchDoc.name,
      membership: {
        male: Number(membershipMale)||0, female: Number(membershipFemale)||0,
        children: Number(membershipChildren)||0, visitors: Number(membershipVisitors)||0,
        soulsAdded: Number(soulsAdded)||0
      },
      income: {
        tithes: Number(tithes)||0, offerings: Number(offerings)||0,
        membershipDues: Number(membershipDues)||0, projectOffering: Number(projectOffering)||0,
        childrenService: Number(childrenService)||0, seeds: Number(seeds)||0,
        pledges: Number(pledges)||0, revivalPrograms: Number(revivalPrograms)||0,
        bank: Number(bank)||0, otherFunds: Number(otherFunds)||0,
        customFields: customIncomeFields
      },
      expenditure: {
        lightChurchPremises: Number(lightChurchPremises)||0,
        pastorsAllowance: Number(pastorsAllowance)||0,
        otherExpenses: Number(otherExpenses)||0,
        customFields: customExpenseFields
      },
      preparedBy: preparedBy || 'Unknown',
      preparedBySignature: preparedBySignature || '',
      residentPastor: residentPastor || 'Unknown',
      residentPastorSignature: residentPastorSignature || '',
      submittedViaLink: !!token,
      ipAddress: req.ip
    });

    await report.save();
    if (token) await FormLink.findOneAndUpdate({ token }, { $inc: { usageCount: 1 } });

    if (req.session.user) {
      req.flash('success_msg', '✅ Monthly report submitted! Report ID: ' + report.reportId);
      return res.redirect('/forms?tab=monthly');
    }
    res.render('forms/success', { title: 'Submitted - FPCI', reportType: 'Monthly', reportId: report.reportId });
  } catch (error) {
    console.error('Monthly report submission error:', error.message);
    if (req.session.user) {
      req.flash('error_msg', 'Submission failed: ' + error.message);
      return res.redirect('/forms?tab=monthly');
    }
    res.status(500).render('partials/error', { title: 'Error', error: error });
  }
});

// POST Generate Form Link
router.post('/generate-link', requireAdmin, async (req, res) => {
  try {
    const { formType, branch, expiresInDays, description } = req.body;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 30));

    const formLink = await FormLink.create({
      formType: formType || 'both',
      branch: branch || undefined,
      createdBy: req.session.user._id,
      expiresAt, description
    });

    req.flash('success_msg', 'Form link generated successfully!');
    res.redirect('/admin/links');
  } catch (error) {
    console.error('Link generation error:', error);
    req.flash('error_msg', 'Failed to generate link: ' + error.message);
    res.redirect('/admin/links');
  }
});

module.exports = router;
