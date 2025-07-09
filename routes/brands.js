const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = admin.firestore();
const brandsRef = db.collection('brands');

// Get brand by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const snapshot = await brandsRef.where('slug', '==', slug).get();
    const brands = [];
    snapshot.forEach(doc => {
      brands.push({ id: doc.id, ...doc.data() });
    });
    res.json(brands.length > 0 ? brands[0] : null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand by slug' });
  }
});

// Get featured brands
router.get('/featured', async (req, res) => {
  try {
    const snapshot = await brandsRef.where('featured', '==', true).get();
    const brands = [];
    snapshot.forEach(doc => {
      brands.push({ id: doc.id, ...doc.data() });
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured brands' });
  }
});

// Get all brands
router.get('/', async (req, res) => {
  try {
    const snapshot = await brandsRef.get();
    const brands = [];
    snapshot.forEach(doc => {
      brands.push({ id: doc.id, ...doc.data() });
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get brand by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await brandsRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// Create new brand
router.post('/', async (req, res) => {
  try {
    const { name, logo, slug, featured = false } = req.body;
    if (!name || !logo || !slug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const brandData = {
      name,
      logo,
      slug,
      featured,
      carCount: 0
    };

    const docRef = await brandsRef.add(brandData);
    res.status(201).json({ id: docRef.id, ...brandData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update brand
router.put('/:id', async (req, res) => {
  try {
    const { name, logo, slug, featured, carCount } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (logo) updates.logo = logo;
    if (slug) updates.slug = slug;
    if (featured !== undefined) updates.featured = featured;
    if (carCount !== undefined) updates.carCount = carCount;

    await brandsRef.doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...updates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// Delete brand
router.delete('/:id', async (req, res) => {
  try {
    await brandsRef.doc(req.params.id).delete();
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

module.exports = router;
