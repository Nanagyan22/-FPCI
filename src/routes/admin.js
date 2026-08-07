const express = require('express');
const router = express.Router();
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const User    = require('../models/User');
const Branch  = require('../models/Branch');
const Pastor  = require('../models/Pastor');
const FormLink = require('../models/FormLink');

// GET Admin Panel
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [users, branches, pastors, formLinks] = await Promise.all([
      User.find().sort('lastName'),
      Branch.find().sort('name').populate('pastors'),
      Pastor.find().sort('lastName').populate('branches'),
      FormLink.find().populate('createdBy','firstName lastName').populate('branch','name').sort('-createdAt').limit(20)
    ]);
    res.render('admin/index', {
      title: 'Admin Panel - FPCI', users, branches, pastors, formLinks,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Admin error:', error);
    req.flash('error_msg', 'Error loading admin panel');
    res.redirect('/dashboard');
  }
});

// ==================== FORM LINKS ====================
router.get('/links', requireAdmin, async (req, res) => {
  try {
    const [formLinks, branches] = await Promise.all([
      FormLink.find().populate('createdBy','firstName lastName').populate('branch','name').sort('-createdAt'),
      Branch.find({ isActive: true }).sort('name')
    ]);
    // appUrl is now set dynamically in server.js globals — no need to pass it here
    res.render('admin/links', {
      title: 'Form Links - FPCI', formLinks, branches,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading form links');
    res.redirect('/admin');
  }
});

router.delete('/links/:id', requireAdmin, async (req, res) => {
  try {
    await FormLink.findByIdAndUpdate(req.params.id, { isActive: false });
    req.flash('success_msg', 'Form link deactivated');
    res.redirect('/admin/links');
  } catch (error) {
    req.flash('error_msg', 'Error deactivating link');
    res.redirect('/admin/links');
  }
});

// ==================== USERS ====================
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const [users, branches] = await Promise.all([
      User.find().populate('branch','name').sort('firstName'),
      Branch.find({ isActive: true }).sort('name')
    ]);
    res.render('admin/users', {
      title: 'User Management - FPCI', users, branches,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading users');
    res.redirect('/admin');
  }
});

router.post('/users/add', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, branch } = req.body;
    await User.create({ firstName, lastName, email, password, role, branch: branch || undefined });
    req.flash('success_msg', `User ${firstName} ${lastName} added successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    req.flash('error_msg', 'Error adding user: ' + error.message);
    res.redirect('/admin/users');
  }
});

router.get('/users/edit/:id', requireAdmin, async (req, res) => {
  try {
    const [editUser, branches] = await Promise.all([
      User.findById(req.params.id).populate('branch','name'),
      Branch.find({ isActive: true }).sort('name')
    ]);
    const users = await User.find().populate('branch','name').sort('firstName');
    if (!editUser) { req.flash('error_msg', 'User not found'); return res.redirect('/admin/users'); }
    res.render('admin/users', {
      title: 'Edit User - FPCI', users, branches, editUser,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading user');
    res.redirect('/admin/users');
  }
});

router.put('/users/edit/:id', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, role, branch, isActive } = req.body;
    await User.findByIdAndUpdate(req.params.id, {
      firstName, lastName, email, role,
      branch: branch || undefined,
      isActive: isActive !== 'false'
    });
    req.flash('success_msg', 'User updated successfully');
    res.redirect('/admin/users');
  } catch (error) {
    req.flash('error_msg', 'Error updating user: ' + error.message);
    res.redirect('/admin/users');
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', `User ${u ? u.firstName + ' ' + u.lastName : ''} deleted`);
    res.redirect('/admin/users');
  } catch (error) {
    req.flash('error_msg', 'Error deleting user');
    res.redirect('/admin/users');
  }
});

// ==================== PASTORS ====================
router.get('/pastors', requireAdmin, async (req, res) => {
  try {
    const [pastors, branches] = await Promise.all([
      Pastor.find().populate('branches','name').sort('lastName'),
      Branch.find({ isActive: true }).sort('name')
    ]);
    res.render('admin/pastors', {
      title: 'Pastors Management - FPCI', pastors, branches,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading pastors');
    res.redirect('/admin');
  }
});

router.post('/pastors/add', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, title, email, phone, branches, isPrimaryPastor, bio } = req.body;
    const branchIds = Array.isArray(branches) ? branches : [branches].filter(Boolean);
    const pastor = await Pastor.create({ firstName, lastName, title, email, phone, branches: branchIds, isPrimaryPastor: isPrimaryPastor === 'on', bio });
    await Branch.updateMany({ _id: { $in: branchIds } }, { $addToSet: { pastors: pastor._id } });
    req.flash('success_msg', `Pastor ${pastor.title} ${pastor.firstName} ${pastor.lastName} added`);
    res.redirect('/admin/pastors');
  } catch (error) {
    req.flash('error_msg', 'Error adding pastor: ' + error.message);
    res.redirect('/admin/pastors');
  }
});

router.put('/pastors/edit/:id', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, title, email, phone, branches, isPrimaryPastor, isActive } = req.body;
    const branchIds = Array.isArray(branches) ? branches : [branches].filter(Boolean);
    await Pastor.findByIdAndUpdate(req.params.id, { firstName, lastName, title, email, phone, branches: branchIds, isPrimaryPastor: isPrimaryPastor === 'on', isActive: isActive !== 'false' });
    await Branch.updateMany({ _id: { $in: branchIds } }, { $addToSet: { pastors: req.params.id } });
    req.flash('success_msg', 'Pastor updated successfully');
    res.redirect('/admin/pastors');
  } catch (error) {
    req.flash('error_msg', 'Error updating pastor: ' + error.message);
    res.redirect('/admin/pastors');
  }
});

router.delete('/pastors/:id', requireAdmin, async (req, res) => {
  try {
    const pastor = await Pastor.findByIdAndDelete(req.params.id);
    if (pastor) { await Branch.updateMany({ pastors: req.params.id }, { $pull: { pastors: req.params.id } }); }
    req.flash('success_msg', 'Pastor deleted successfully');
    res.redirect('/admin/pastors');
  } catch (error) {
    req.flash('error_msg', 'Error deleting pastor');
    res.redirect('/admin/pastors');
  }
});

module.exports = router;
