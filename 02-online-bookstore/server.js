const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/02-online-bookstore';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const cartItemSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      unique: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    items: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
        title: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'Confirmed' },
  },
  { timestamps: true }
);

const Book = mongoose.model('Book', bookSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);
const Order = mongoose.model('Order', orderSchema);

const SEED_BOOKS = [
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Programming',
    price: 549,
    stock: 8,
    description: 'Practical handbook of agile software craftsmanship and readable code.',
  },
  {
    title: 'Eloquent JavaScript',
    author: 'Marijn Haverbeke',
    category: 'Programming',
    price: 499,
    stock: 3,
    description: 'Modern introduction to JavaScript, Node.js, and browser programming.',
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    category: 'Fiction',
    price: 299,
    stock: 10,
    description: 'A timeless fable about following your dreams and personal legend.',
  },
  {
    title: '1984',
    author: 'George Orwell',
    category: 'Fiction',
    price: 249,
    stock: 2,
    description: 'Classic dystopian novel exploring surveillance, truth, and freedom.',
  },
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    category: 'Science',
    price: 399,
    stock: 6,
    description: 'Accessible journey through black holes, relativity, and the cosmos.',
  },
  {
    title: 'Cosmos',
    author: 'Carl Sagan',
    category: 'Science',
    price: 449,
    stock: 5,
    description: 'Celebrated exploration of science, astronomy, and human curiosity.',
  },
];

async function seedIfEmpty() {
  const count = await Book.countDocuments();
  if (count === 0) {
    await Book.insertMany(SEED_BOOKS);
    console.log('Seeded 6 sample books across 3 categories.');
  }
}

async function getFormattedCart() {
  const rawItems = await CartItem.find().populate('book').sort({ createdAt: 1 });
  const items = [];

  for (const entry of rawItems) {
    if (!entry.book) {
      await CartItem.findByIdAndDelete(entry._id);
      continue;
    }
    items.push({
      _id: entry._id,
      bookId: entry.book._id,
      title: entry.book.title,
      author: entry.book.author,
      category: entry.book.category,
      price: entry.book.price,
      stock: entry.book.stock,
      quantity: entry.quantity,
      lineTotal: entry.book.price * entry.quantity,
    });
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return { items, totalItems, totalAmount };
}

// GET all books (supports ?category=...)
app.get('/api/books', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const filter = category && category !== 'All' ? { category } : {};
    const books = await Book.find(filter).sort({ category: 1, title: 1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
});

// GET persistent cart
app.get('/api/cart', async (req, res) => {
  try {
    const cart = await getFormattedCart();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cart.' });
  }
});

// POST add book to persistent cart
app.post('/api/cart', async (req, res) => {
  try {
    const { bookId, quantity = 1 } = req.body;
    const qtyToAdd = Number(quantity);

    if (!bookId || !Number.isInteger(qtyToAdd) || qtyToAdd < 1) {
      return res.status(400).json({ error: 'Valid bookId and positive quantity are required.' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    if (book.stock <= 0) {
      return res.status(400).json({ error: `"${book.title}" is currently out of stock.` });
    }

    const existing = await CartItem.findOne({ book: book._id });
    const nextQty = (existing ? existing.quantity : 0) + qtyToAdd;

    if (nextQty > book.stock) {
      return res.status(400).json({
        error: `Low stock: Only ${book.stock} copy/copies of "${book.title}" available.`,
      });
    }

    if (existing) {
      existing.quantity = nextQty;
      await existing.save();
    } else {
      await CartItem.create({ book: book._id, quantity: qtyToAdd });
    }

    const cart = await getFormattedCart();
    res.status(201).json(cart);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }
    res.status(500).json({ error: 'Failed to add book to cart.' });
  }
});

// PATCH update cart item quantity
app.patch('/api/cart/:bookId', async (req, res) => {
  try {
    const qty = Number(req.body.quantity);
    if (!Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Quantity must be a whole number.' });
    }

    const existing = await CartItem.findOne({ book: req.params.bookId });
    if (!existing) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    if (qty <= 0) {
      await CartItem.deleteOne({ _id: existing._id });
      const cart = await getFormattedCart();
      return res.json(cart);
    }

    const book = await Book.findById(req.params.bookId);
    if (!book) {
      await CartItem.deleteOne({ _id: existing._id });
      return res.status(404).json({ error: 'Book no longer exists.' });
    }

    if (qty > book.stock) {
      return res.status(400).json({
        error: `Low stock: Only ${book.stock} copy/copies of "${book.title}" available.`,
      });
    }

    existing.quantity = qty;
    await existing.save();

    const cart = await getFormattedCart();
    res.json(cart);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }
    res.status(500).json({ error: 'Failed to update cart item.' });
  }
});

// DELETE remove item from cart
app.delete('/api/cart/:bookId', async (req, res) => {
  try {
    await CartItem.deleteOne({ book: req.params.bookId });
    const cart = await getFormattedCart();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item from cart.' });
  }
});

// GET recent orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// POST checkout and store order in DB
app.post('/api/orders', async (req, res) => {
  try {
    const customerName = typeof req.body.customerName === 'string' ? req.body.customerName.trim() : '';
    const customerEmail = typeof req.body.customerEmail === 'string' ? req.body.customerEmail.trim() : '';

    if (!customerName || !customerEmail) {
      return res.status(400).json({ error: 'Customer name and email are required to place an order.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'Please enter a valid customer email address.' });
    }

    const cartItems = await CartItem.find().populate('book');
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty. Add at least one book before ordering.' });
    }

    for (const entry of cartItems) {
      if (!entry.book) {
        return res.status(400).json({ error: 'One of the books in your cart is unavailable.' });
      }
      if (entry.quantity > entry.book.stock) {
        return res.status(400).json({
          error: `Insufficient stock for "${entry.book.title}". Available: ${entry.book.stock}.`,
        });
      }
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const entry of cartItems) {
      const updatedBook = await Book.findOneAndUpdate(
        { _id: entry.book._id, stock: { $gte: entry.quantity } },
        { $inc: { stock: -entry.quantity } },
        { new: true }
      );

      if (!updatedBook) {
        return res.status(409).json({
          error: `Stock changed for "${entry.book.title}". Please review your cart and try again.`,
        });
      }

      orderItems.push({
        bookId: entry.book._id,
        title: entry.book.title,
        price: entry.book.price,
        quantity: entry.quantity,
      });
      totalAmount += entry.book.price * entry.quantity;
    }

    const order = await Order.create({
      customerName,
      customerEmail,
      items: orderItems,
      totalAmount,
      status: 'Confirmed',
    });

    await CartItem.deleteMany({});

    res.status(201).json(order);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message)[0];
      return res.status(400).json({ error: msg || 'Invalid order details.' });
    }
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Book.init();
    await CartItem.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Online Bookstore running at http://localhost:${PORT}`);
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
