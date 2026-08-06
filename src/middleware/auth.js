const User = require('../models/User');

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please login to access this page');
    return res.redirect('/auth/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please login to access this page');
    return res.redirect('/auth/login');
  }
  if (!['super_admin', 'admin'].includes(req.session.user.role)) {
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    return res.redirect('/dashboard');
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please login to access this page');
    return res.redirect('/auth/login');
  }
  if (req.session.user.role !== 'super_admin') {
    req.flash('error_msg', 'Access denied. Super Admin privileges required.');
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireSuperAdmin };
