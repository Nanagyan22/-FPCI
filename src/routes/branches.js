const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const Pastor = require('../models/Pastor');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET All Branches
router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await Branch.find().sort('name').populate('pastors');
    res.render('branches/index', {
      title: 'Branches - FPCI', branches,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading branches');
    res.redirect('/dashboard');
  }
});

// GET Add Branch
router.get('/add', requireAdmin, async (req, res) => {
  try {
    const pastors = await Pastor.find({ isActive: true }).sort('lastName');
    res.render('branches/add', {
      title: 'Add Branch - FPCI', pastors,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading page');
    res.redirect('/branches');
  }
});

// POST Add Branch
router.post('/add', requireAdmin, async (req, res) => {
  try {
    const { name, code, location, region, address, phone, email, establishedDate, isHeadquarters, description, pastors } = req.body;
    const branch = await Branch.create({
      name, code: (code||'').toUpperCase(), location, region, address, phone, email,
      establishedDate: establishedDate || undefined,
      isHeadquarters: isHeadquarters === 'on',
      description,
      pastors: Array.isArray(pastors) ? pastors : [pastors].filter(Boolean)
    });
    if (pastors) {
      const ids = Array.isArray(pastors) ? pastors : [pastors];
      await Pastor.updateMany({ _id: { $in: ids } }, { $addToSet: { branches: branch._id } });
    }
    req.flash('success_msg', `Branch "${name}" added successfully`);
    res.redirect('/branches');
  } catch (error) {
    req.flash('error_msg', 'Error adding branch: ' + error.message);
    res.redirect('/branches/add');
  }
});

// GET Edit Branch
router.get('/edit/:id', requireAdmin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('pastors');
    const pastors = await Pastor.find({ isActive: true }).sort('lastName');
    if (!branch) { req.flash('error_msg', 'Branch not found'); return res.redirect('/branches'); }
    res.render('branches/edit', {
      title: 'Edit Branch - FPCI', branch, pastors,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading branch');
    res.redirect('/branches');
  }
});

// PUT Update Branch
router.put('/edit/:id', requireAdmin, async (req, res) => {
  try {
    const { name, code, location, region, address, phone, email, establishedDate, isHeadquarters, isActive, description, pastors } = req.body;
    await Branch.findByIdAndUpdate(req.params.id, {
      name, code: (code||'').toUpperCase(), location, region, address, phone, email,
      establishedDate: establishedDate || undefined,
      isHeadquarters: isHeadquarters === 'on',
      isActive: isActive !== 'false',
      description,
      pastors: Array.isArray(pastors) ? pastors : [pastors].filter(Boolean)
    }, { new: true });
    req.flash('success_msg', `Branch "${name}" updated successfully`);
    res.redirect('/branches');
  } catch (error) {
    req.flash('error_msg', 'Error updating branch: ' + error.message);
    res.redirect('/branches');
  }
});

// DELETE Branch (permanent delete)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (branch) {
      await Pastor.updateMany({ branches: req.params.id }, { $pull: { branches: req.params.id } });
      req.flash('success_msg', `Branch "${branch.name}" deleted successfully`);
    }
    res.redirect('/branches');
  } catch (error) {
    req.flash('error_msg', 'Error deleting branch: ' + error.message);
    res.redirect('/branches');
  }
});

// API: Get pastors for a branch
router.get('/api/:id/pastors', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('pastors');
    res.json({ pastors: branch ? branch.pastors : [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
