const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/13-inventory-management';
const LOW_STOCK_THRESHOLD = 10;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    supplier: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

const SEED_PRODUCTS = [
  { name: 'USB-C Hub (6-in-1)', quantity: 24, price: 1200, supplier: 'TechLine Distributors' },
  { name: 'Wireless Mechanical Keyboard', quantity: 6, price: 2450, supplier: 'KeyPro Supplies' },
  { name: 'A4 Printing Paper (Ream)', quantity: 45, price: 320, supplier: 'Metro Stationery' },
  { name: 'HDMI 2.1 Cable (2m)', quantity: 4, price: 450, supplier: 'CableLink India' },
  { name: 'Optical Ergonomic Mouse', quantity: 15, price: 650, supplier: 'TechLine Distributors' },
];

async function seedIfEmpty() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(SEED_PRODUCTS);
    console.log('Seeded 5 sample inventory products.');
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseProductPayload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : '';
  const quantity =
    body.quantity === '' || body.quantity === null || body.quantity === undefined
      ? NaN
      : Number(body.quantity);
  const price =
    body.price === '' || body.price === null || body.price === undefined
      ? NaN
      : Number(body.price);

  return { name, quantity, price, supplier };
}

function validateProductPayload(payload) {
  if (!payload.name || !payload.supplier) {
    return 'Product Name and Supplier are required.';
  }
  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
    return 'Quantity must be a whole number (0 or greater).';
  }
  if (Number.isNaN(payload.price) || payload.price < 0) {
    return 'Price must be a valid number (0 or greater).';
  }
  return null;
}

// Dedicated endpoint to calculate and return total inventory value
app.get('/api/inventory/value', async (req, res) => {
  try {
    const [stats] = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          totalUnits: { $sum: '$quantity' },
          productCount: { $sum: 1 },
          lowStockCount: {
            $sum: { $cond: [{ $lt: ['$quantity', LOW_STOCK_THRESHOLD] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      totalValue: stats ? Number(stats.totalValue.toFixed(2)) : 0,
      totalUnits: stats ? stats.totalUnits : 0,
      productCount: stats ? stats.productCount : 0,
      lowStockCount: stats ? stats.lowStockCount : 0,
      threshold: LOW_STOCK_THRESHOLD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate inventory value.' });
  }
});

// GET all products (optional ?q= search and ?lowStock=true)
app.get('/api/products', async (req, res) => {
  try {
    const filter = {};
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const lowStock = req.query.lowStock === 'true';

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: regex }, { supplier: regex }];
    }
    if (lowStock) {
      filter.quantity = { $lt: LOW_STOCK_THRESHOLD };
    }

    const products = await Product.find(filter).sort({ quantity: 1, name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// POST add a new product
app.post('/api/products', async (req, res) => {
  try {
    const payload = parseProductPayload(req.body);
    const errMsg = validateProductPayload(payload);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const created = await Product.create(payload);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: A product with this name already exists.' });
    }
    res.status(500).json({ error: 'Failed to add product.' });
  }
});

// PUT update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const payload = parseProductPayload(req.body);
    const errMsg = validateProductPayload(payload);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: 'Product not found.' });

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: Another product already uses this name.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Product.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Inventory Management running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('\nMongoDB is not running on 127.0.0.1:27017.');
      console.error('Start MongoDB before running npm start.\n');
    }
    process.exit(1);
  }
}

startServer();
