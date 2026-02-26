// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Login admin simple (credentials dans .env)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Vérification des credentials (à mettre dans .env)
  if (
    username === process.env.ADMIN_USERNAME && 
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ 
      token, 
      message: 'Connexion réussie',
      admin: { username }
    });
  }

  res.status(401).json({ message: 'Identifiants incorrects' });
});

// Vérifier le token
router.get('/verify', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, admin: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
