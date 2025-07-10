const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = admin.firestore();
const categoriesRef = db.collection('categories');

// Cache-Control middleware
const setCacheControl = (duration) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${duration}`);
  next();
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader); // Debug log

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No bearer token'); // Debug log
      return res.status(401).json({ error: 'No bearer token' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Verifying token...'); // Debug log
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Decoded token:', decodedToken); // Debug log
    
    if (!decodedToken.email?.endsWith('@esrent.ae')) {
      console.log('Not an esrent email:', decodedToken.email); // Debug log
      return res.status(403).json({ error: 'Not an authorized email domain' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
};

// Get all categories with pagination
router.get('/', setCacheControl(600), async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'name' } = req.query;
    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;

    let query = categoriesRef;
    if (sort) {
      query = query.orderBy(sort);
    }

    const snapshot = await query.get();
    const total = snapshot.size;
    
    const categories = [];
    snapshot.forEach((doc, index) => {
      if (index >= offset && index < offset + pageSize) {
        categories.push({ id: doc.id, ...doc.data() });
      }
    });

    res.json({
      categories,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / pageSize),
      totalItems: total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get categories by type
router.get('/type/:type', setCacheControl(600), async (req, res) => {
  try {
    const { type } = req.params;
    let query = categoriesRef;
    
    // If it's a car type (SUV, Sedan, etc.), look for categories with type="carType" and value=type
    if (['SUV', 'Sedan', 'Hatchback', 'Convertible', 'Coupe'].includes(type)) {
      query = categoriesRef
        .where('type', '==', 'carType')
        .where('value', '==', type);
    } else {
      // For other category types (fuelType, tag, etc.)
      query = categoriesRef.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get featured categories
router.get('/featured', setCacheControl(600), async (req, res) => {
  try {
    const snapshot = await categoriesRef.where('featured', '==', true).get();
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured categories' });
  }
});

// Search categories
router.get('/search', setCacheControl(60), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const nameSnapshot = await categoriesRef
      .where('name', '>=', q)
      .where('name', '<=', q + '\uf8ff')
      .get();
    
    const typeSnapshot = await categoriesRef
      .where('type', '>=', q)
      .where('type', '<=', q + '\uf8ff')
      .get();

    const categories = new Map();
    
    nameSnapshot.forEach(doc => {
      categories.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    typeSnapshot.forEach(doc => {
      categories.set(doc.id, { id: doc.id, ...doc.data() });
    });

    res.json(Array.from(categories.values()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to search categories' });
  }
});

// Get category by slug
router.get('/slug/:slug', setCacheControl(600), async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Query Firestore for the category with matching slug
    const snapshot = await categoriesRef.where('slug', '==', slug).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const doc = snapshot.docs[0];
    const category = {
      id: doc.id,
      ...doc.data()
    };

    res.json(category);
  } catch (error) {
    console.error('Error getting category by slug:', error);
    res.status(500).json({ 
      error: 'Failed to get category',
      details: error.message 
    });
  }
});

// Create category (Admin only)
router.post('/', requireAdmin, setCacheControl(0), async (req, res) => {
  try {
    const { name, type, slug, featured, description } = req.body;
    
    // Validate required fields
    if (!name || !type || !slug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if slug already exists
    const slugSnapshot = await categoriesRef.where('slug', '==', slug).get();
    if (!slugSnapshot.empty) {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }

    const categoryData = {
      name,
      type,
      slug,
      featured: featured || false,
      description: description || '',
      carCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await categoriesRef.add(categoryData);
    res.status(201).json({ id: docRef.id, ...categoryData });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (Admin only)
router.put('/:id', requireAdmin, setCacheControl(0), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;

    const docRef = categoriesRef.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // If slug is being updated, check for duplicates
    if (updates.slug && updates.slug !== doc.data().slug) {
      const slugSnapshot = await categoriesRef
        .where('slug', '==', updates.slug)
        .get();
      if (!slugSnapshot.empty) {
        return res.status(400).json({ error: 'Category with this slug already exists' });
      }
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await docRef.update(updates);
    
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (Admin only)
router.delete('/:id', requireAdmin, setCacheControl(0), async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = categoriesRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await docRef.delete();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
