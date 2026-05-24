/**
 * TEMPORARY ADMIN SEED ENDPOINT
 * Remove this after seeding admin user
 * POST /api/seed-admin-temp
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const email = 'admin@peermatch.com';
    const name = 'PeerMatch Admin';
    const username = 'admin';

    // Check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      username,
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      verified: true,
    });

    res.json({ 
      message: 'Admin user created successfully',
      email,
      warning: 'REMOVE THIS ENDPOINT AFTER USE'
    });
  } catch (error) {
    console.error('Seed admin error:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

module.exports = router;
