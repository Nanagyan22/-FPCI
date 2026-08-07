const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET Login
router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', {
    title: 'Login - FPCI',
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg'),
    error: req.flash('error')
  });
});

// POST Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password provided:', !!password);

    if (!email || !password) {
      req.flash('error_msg', 'Please enter both email and password');
      return res.redirect('/auth/login');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    console.log('User found:', !!user);
    if (user) {
      console.log('User role:', user.role);
      console.log('User isActive:', user.isActive);
      console.log('User firstName:', user.firstName);
      console.log('User lastName:', user.lastName);
      console.log('Has password:', !!user.password);
    }

    if (!user) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    if (!user.isActive) {
      req.flash('error_msg', 'Your account has been deactivated. Contact admin.');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.user = {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      branch: user.branch
    };

    console.log('Session set:', req.session.user);

    // Save session explicitly before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error_msg', 'Login error. Please try again.');
        return res.redirect('/auth/login');
      }
      console.log('Session saved successfully, redirecting to dashboard');
      res.redirect('/dashboard');
    });

  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/auth/login');
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/auth/login');
  });
});

module.exports = router;
