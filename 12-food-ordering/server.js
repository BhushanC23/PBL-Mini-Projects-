const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/12-food-ordering';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    tableOrRoom: { type: String, required: true, trim: true },
    items: [
      {
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        lineTotal: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true, min: 1 },
    status: { type: String, default: 'Placed' },
  },
  { timestamps: true }
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Order = mongoose.model('Order', orderSchema);

const SEED_MENU = [
  {
    name: 'Masala Dosa',
    category: 'Meals',
    price: 80,
    description: 'Crispy rice crepe stuffed with spiced potato masala, sambar, and chutney.',
  },
  {
    name: 'Paneer Tikka Roll',
    category: 'Snacks',
    price: 110,
    description: 'Grilled cottage cheese cubes wrapped in flaky paratha with mint sauce.',
  },
  {
    name: 'Veg Biryani Bowl',
    category: 'Meals',
    price: 140,
    description: 'Fragrant basmati rice cooked with mixed vegetables, herbs, and raita.',
  },
  {
    name: 'Margherita Pizza (8")',
    category: 'Meals',
    price: 180,
    description: 'Stone-baked thin crust topped with tomato basil sauce and mozzarella.',
  },
  {
    name: 'Crispy Masala Fries',
    category: 'Snacks',
    price: 70,
    description: 'Golden salted potato fries tossed in peri-peri spice blend.',
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 60,
    description: 'Chilled espresso blended with milk, ice cream, and cocoa drizzle.',
  },
];

async function seedIfEmpty() {
  let menuDocs = await MenuItem.find();
  if (menuDocs.length === 0) {
    menuDocs = await MenuItem.insertMany(SEED_MENU);
    console.log('Seeded 6 sample food menu items.');
  }

  const orderCount = await Order.countDocuments();
  if (orderCount === 0 && menuDocs.length >= 3) {
    const dosa = menuDocs.find((m) => m.name === 'Masala Dosa') || menuDocs[0];
    const coffee = menuDocs.find((m) => m.name === 'Cold Coffee') || menuDocs[1];
    const roll = menuDocs.find((m) => m.name === 'Paneer Tikka Roll') || menuDocs[2];

    await Order.insertMany([
      {
        customerName: 'Aarav Sharma',
        tableOrRoom: 'Table 4',
        items: [
          {
            menuItemId: dosa._id,
            name: dosa.name,
            price: dosa.price,
            quantity: 2,
            lineTotal: dosa.price * 2,
          },
          {
            menuItemId: coffee._id,
            name: coffee.name,
            price: coffee.price,
            quantity: 1,
            lineTotal: coffee.price,
          },
        ],
        totalAmount: dosa.price * 2 + coffee.price,
        status: 'Placed',
      },
      {
        customerName: 'Priya Nair',
        tableOrRoom: 'Hostel B-102',
        items: [
          {
            menuItemId: roll._id,
            name: roll.name,
            price: roll.price,
            quantity: 2,
            lineTotal: roll.price * 2,
          },
        ],
        totalAmount: roll.price * 2,
        status: 'Placed',
      },
    ]);
    console.log('Seeded 2 sample food orders.');
  }
}

// GET food menu (optional ?category= filter)
app.get('/api/menu', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const filter = category && category !== 'All' ? { category } : {};
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load food menu.' });
  }
});

// GET order history (newest first)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(25);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load order history.' });
  }
});

// POST place a new food order (computes totals server-side from DB prices)
app.post('/api/orders', async (req, res) => {
  try {
    const customerName = typeof req.body.customerName === 'string' ? req.body.customerName.trim() : '';
    const tableOrRoom = typeof req.body.tableOrRoom === 'string' ? req.body.tableOrRoom.trim() : '';
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (!customerName || !tableOrRoom) {
      return res.status(400).json({ error: 'Customer Name and Table / Room No. are required.' });
    }

    const validPairs = rawItems
      .map((i) => ({
        menuItemId: typeof i.menuItemId === 'string' ? i.menuItemId.trim() : '',
        quantity: Number(i.quantity),
      }))
      .filter((i) => i.menuItemId && Number.isInteger(i.quantity) && i.quantity > 0);

    if (validPairs.length === 0) {
      return res.status(400).json({ error: 'Select at least one menu item with quantity >= 1.' });
    }

    const ids = validPairs.map((i) => i.menuItemId);
    const menuDocs = await MenuItem.find({ _id: { $in: ids } });
    const menuMap = new Map(menuDocs.map((doc) => [String(doc._id), doc]));

    const orderItems = [];
    let totalAmount = 0;

    for (const pair of validPairs) {
      const doc = menuMap.get(pair.menuItemId);
      if (!doc || !doc.isAvailable) {
        return res.status(400).json({ error: 'One or more selected menu items are unavailable.' });
      }
      const lineTotal = doc.price * pair.quantity;
      totalAmount += lineTotal;
      orderItems.push({
        menuItemId: doc._id,
        name: doc.name,
        price: doc.price,
        quantity: pair.quantity,
        lineTotal,
      });
    }

    const order = await Order.create({
      customerName,
      tableOrRoom,
      items: orderItems,
      totalAmount,
      status: 'Placed',
    });

    res.status(201).json(order);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// DELETE order (cleanup / cancel)
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ message: 'Order deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }
    res.status(500).json({ error: 'Failed to delete order.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await MenuItem.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Food Ordering App running at http://localhost:${PORT}`);
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
