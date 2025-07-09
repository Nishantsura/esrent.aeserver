const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

const db = admin.firestore();
const carsRef = db.collection('cars');

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
    
    if (!decodedToken.email?.endsWith('@autoluxe.com')) {
      console.log('Not an autoluxe email:', decodedToken.email); // Debug log
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

// Get featured cars - MOVED UP
router.get('/featured', setCacheControl(600), async (req, res) => {
  try {
    const snapshot = await carsRef.where('featured', '==', true).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured cars' });
  }
});

// Get cars by type - MOVED UP
router.get('/type/:type', setCacheControl(300), async (req, res) => {
  try {
    const { type } = req.params;
    const snapshot = await carsRef.where('type', '==', type).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars by type' });
  }
});

// Get cars by fuel type - MOVED UP
router.get('/fuel-type/:fuelType', setCacheControl(300), async (req, res) => {
  try {
    const { fuelType } = req.params;
    const snapshot = await carsRef.where('fuelType', '==', fuelType).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars by fuel type' });
  }
});

// Get cars by tag - MOVED UP
router.get('/tag/:tag', setCacheControl(300), async (req, res) => {
  try {
    const { tag } = req.params;
    const snapshot = await carsRef.where('tags', 'array-contains', tag).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars by tag' });
  }
});

// Get cars by brand - MOVED UP
router.get('/brand/:brand', setCacheControl(300), async (req, res) => {
  try {
    const { brand } = req.params;
    const snapshot = await carsRef.where('brand', '==', brand).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars by brand' });
  }
});

// Get all cars with optional filters
router.get('/', setCacheControl(300), async (req, res) => {
  try {
    let query = carsRef;
    const {
      brand,
      transmission,
      type,
      fuelType,
      available,
      minPrice,
      maxPrice
    } = req.query;

    if (brand) query = query.where('brand', '==', brand);
    if (transmission) query = query.where('transmission', '==', transmission);
    if (type) query = query.where('type', '==', type);
    if (fuelType) query = query.where('fuelType', '==', fuelType);
    if (available !== undefined) query = query.where('available', '==', available === 'true');
    
    const snapshot = await query.get();
    let cars = [];
    
    snapshot.forEach(doc => {
      const car = { id: doc.id, ...doc.data() };
      if (minPrice && car.dailyPrice < Number(minPrice)) return;
      if (maxPrice && car.dailyPrice > Number(maxPrice)) return;
      cars.push(car);
    });

    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Get car by ID - MOVED DOWN
router.get('/:id', setCacheControl(300), async (req, res) => {
  try {
    const doc = await carsRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});

// Create new car
router.post('/', setCacheControl(0), async (req, res) => {
  try {
    const {
      name,
      brand,
      transmission,
      seats,
      year,
      rating,
      advancePayment,
      rareCar,
      fuelType,
      engineCapacity,
      power,
      dailyPrice,
      type,
      tags,
      description,
      images,
      location,
      categories
    } = req.body;

    // Validate required fields
    if (!name || !brand || !transmission || !fuelType || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const carData = {
      name,
      brand,
      transmission,
      seats,
      year,
      rating: rating || 0,
      advancePayment: advancePayment || false,
      rareCar: rareCar || false,
      featured: false,
      fuelType,
      engineCapacity,
      power,
      dailyPrice,
      type,
      tags: tags || [],
      description,
      images: images || [],
      available: true,
      location,
      categories: categories || []
    };

    const docRef = await carsRef.add(carData);
    const carWithId = { objectID: docRef.id, ...carData };
    
    res.status(201).json({ id: docRef.id, ...carData });
  } catch (error) {
    console.error('Error creating car:', error, 'Request body:', req.body);
    res.status(500).json({ error: 'Failed to create car', details: error.message });
  }
});

// Update car
router.put('/:id', setCacheControl(0), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id; // Remove id from updates if present

    await carsRef.doc(req.params.id).update(updates);
    
    res.json({ id: req.params.id, ...updates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update car' });
  }
});

// Delete car
router.delete('/:id', setCacheControl(0), async (req, res) => {
  try {
    await carsRef.doc(req.params.id).delete();
    
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// Admin: Get analytics
router.get('/admin/analytics', requireAdmin, async (req, res) => {
  console.log('Fetching analytics...'); // Debug log
  
  // Set a timeout for the request
  const timeout = setTimeout(() => {
    console.error('Analytics request timed out');
    if (!res.headersSent) {
      res.status(504).json({ 
        error: 'Request timed out',
        details: 'The analytics request took too long to process'
      });
    }
  }, 30000); // 30 second timeout

  try {
    // Initialize counts object
    const counts = {
      totalCars: 0,
      totalBrands: 0,
      totalCategories: 0
    };

    // Get counts sequentially to avoid overwhelming Firestore
    try {
      const carsCount = await carsRef.count().get();
      counts.totalCars = carsCount.data()?.count || 0;
      console.log('Cars counted:', counts.totalCars);
    } catch (error) {
      console.error('Error counting cars:', error);
    }

    try {
      const brandsCount = await db.collection('brands').count().get();
      counts.totalBrands = brandsCount.data()?.count || 0;
      console.log('Brands counted:', counts.totalBrands);
    } catch (error) {
      console.error('Error counting brands:', error);
    }

    try {
      const categoriesCount = await db.collection('categories').count().get();
      counts.totalCategories = categoriesCount.data()?.count || 0;
      console.log('Categories counted:', counts.totalCategories);
    } catch (error) {
      console.error('Error counting categories:', error);
    }

    // Clear the timeout since we're done
    clearTimeout(timeout);

    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      console.log('Analytics result:', counts);
      res.json(counts);
    }
  } catch (error) {
    // Clear the timeout since we're handling an error
    clearTimeout(timeout);

    console.error('Analytics error:', error);
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch analytics',
        details: error.message
      });
    }
  }
});

// Admin: Bulk update cars
router.post('/admin/bulk-update', requireAdmin, setCacheControl(0), async (req, res) => {
  console.log('Starting bulk update...'); // Debug log
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      console.log('Invalid updates format:', updates); // Debug log
      return res.status(400).json({ error: 'Invalid updates format' });
    }

    console.log(`Processing ${updates.length} updates...`); // Debug log
    const batch = db.batch();
    
    updates.forEach(({ id, data }, index) => {
      if (!id || !data) {
        console.log(`Skipping invalid update at index ${index}:`, { id, data }); // Debug log
        return;
      }
      console.log(`Batching update for car ${id}`); // Debug log
      const docRef = carsRef.doc(id);
      batch.update(docRef, data);
    });
    
    await batch.commit();
    console.log('Bulk update completed successfully'); // Debug log
    res.json({ success: true, message: `Updated ${updates.length} cars` });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk update',
      details: error.message
    });
  }
});

// Admin: Delete car
router.delete('/admin/:id', requireAdmin, setCacheControl(0), async (req, res) => {
  console.log(`Attempting to delete car ${req.params.id}...`); // Debug log
  try {
    const doc = await carsRef.doc(req.params.id).get();
    
    if (!doc.exists) {
      console.log(`Car ${req.params.id} not found`); // Debug log
      return res.status(404).json({ error: 'Car not found' });
    }

    await carsRef.doc(req.params.id).delete();
    console.log(`Car ${req.params.id} deleted successfully`); // Debug log
    res.json({ 
      success: true, 
      message: 'Car deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete car',
      details: error.message
    });
  }
});

// Add a category to a car
router.post('/:id/categories/:categoryId', requireAdmin, setCacheControl(0), async (req, res) => {
  try {
    const { id, categoryId } = req.params;
    
    // Get the car document
    const carDoc = await carsRef.doc(id).get();
    if (!carDoc.exists) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Get the category document to verify it exists
    const categoryDoc = await db.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get current categories array or initialize if doesn't exist
    const carData = carDoc.data();
    const categories = carData.categories || [];

    // Check if category already exists
    if (categories.includes(categoryId)) {
      return res.status(400).json({ error: 'Category already added to this car' });
    }

    // Add the category
    await carsRef.doc(id).update({
      categories: admin.firestore.FieldValue.arrayUnion(categoryId)
    });

    res.json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// Remove a category from a car
router.delete('/:id/categories/:categoryId', requireAdmin, setCacheControl(0), async (req, res) => {
  try {
    const { id, categoryId } = req.params;
    
    // Get the car document
    const carDoc = await carsRef.doc(id).get();
    if (!carDoc.exists) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Remove the category
    await carsRef.doc(id).update({
      categories: admin.firestore.FieldValue.arrayRemove(categoryId)
    });

    res.json({ message: 'Category removed successfully' });
  } catch (error) {
    console.error('Error removing category:', error);
    res.status(500).json({ error: 'Failed to remove category' });
  }
});

// Get cars by category
router.get('/category/:categoryId', setCacheControl(300), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const snapshot = await carsRef.where('categories', 'array-contains', categoryId).get();
    const cars = [];
    snapshot.forEach(doc => {
      cars.push({ id: doc.id, ...doc.data() });
    });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cars by category' });
  }
});

// Search cars
router.get('/search', setCacheControl(60), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json([]);
    }

    // Convert query to lowercase for case-insensitive search
    const searchQuery = query.toLowerCase();

    // Get all cars and filter them
    const snapshot = await carsRef.get();
    const results = [];
    
    snapshot.forEach(doc => {
      const car = { id: doc.id, ...doc.data() };
      // Search in name, brand, model, and description
      if (
        car.name?.toLowerCase().includes(searchQuery) ||
        car.brand?.toLowerCase().includes(searchQuery) ||
        car.model?.toLowerCase().includes(searchQuery) ||
        car.description?.toLowerCase().includes(searchQuery)
      ) {
        results.push(car);
      }
    });

    // Limit to 10 results
    res.json(results.slice(0, 10));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
