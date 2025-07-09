const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = admin.firestore();
const usersRef = db.collection('users');

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const snapshot = await usersRef.get();
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      // Exclude sensitive information
      delete userData.password;
      users.push({ id: doc.id, ...userData });
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await usersRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = doc.data();
    delete userData.password;
    res.json({ id: doc.id, ...userData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { email, phoneNumber, name } = req.body;

    if (!email || !phoneNumber || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user with email already exists
    const emailCheck = await usersRef.where('email', '==', email).get();
    if (!emailCheck.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userData = {
      email,
      phoneNumber,
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      rentals: [],
      favorites: []
    };

    const docRef = await usersRef.add(userData);
    res.status(201).json({ id: docRef.id, ...userData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.password;
    delete updates.email; // Prevent email updates through this endpoint

    await usersRef.doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Add car to favorites
router.post('/:id/favorites', async (req, res) => {
  try {
    const { carId } = req.body;
    if (!carId) {
      return res.status(400).json({ error: 'Car ID is required' });
    }

    await usersRef.doc(req.params.id).update({
      favorites: admin.firestore.FieldValue.arrayUnion(carId)
    });
    res.json({ message: 'Car added to favorites' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add car to favorites' });
  }
});

// Remove car from favorites
router.delete('/:id/favorites/:carId', async (req, res) => {
  try {
    await usersRef.doc(req.params.id).update({
      favorites: admin.firestore.FieldValue.arrayRemove(req.params.carId)
    });
    res.json({ message: 'Car removed from favorites' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove car from favorites' });
  }
});

module.exports = router;
