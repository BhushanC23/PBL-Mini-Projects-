const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/07-expense-tracker';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORIES = [
  'Salary',
  'Allowance',
  'Freelance',
  'Food',
  'Transport',
  'Utilities',
  'Study',
  'Shopping',
  'Other',
];

const transactionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than 0.'] },
    category: { type: String, enum: CATEGORIES, required: true },
    date: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

function getCurrentMonthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function isValidIsoDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return false;
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() === m - 1 &&
    utc.getUTCDate() === d
  );
}

async function seedIfEmpty() {
  const count = await Transaction.countDocuments();
  if (count === 0) {
    const ym = getCurrentMonthPrefix();
    const seedEntries = [
      {
        title: 'Monthly Stipend / Allowance',
        type: 'income',
        amount: 8000,
        category: 'Allowance',
        date: `${ym}-02`,
      },
      {
        title: 'Web Project Freelance',
        type: 'income',
        amount: 4500,
        category: 'Freelance',
        date: `${ym}-10`,
      },
      {
        title: 'Mess & Groceries',
        type: 'expense',
        amount: 2800,
        category: 'Food',
        date: `${ym}-05`,
      },
      {
        title: 'Reference Books & Printing',
        type: 'expense',
        amount: 950,
        category: 'Study',
        date: `${ym}-12`,
      },
      {
        title: 'Metro & Bus Pass',
        type: 'expense',
        amount: 650,
        category: 'Transport',
        date: `${ym}-15`,
      },
    ];
    await Transaction.insertMany(seedEntries);
    console.log('Seeded 5 sample income & expense entries for current month.');
  }
}

function parseTransactionPayload(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const amount =
    body.amount === '' || body.amount === null || body.amount === undefined
      ? NaN
      : Number(body.amount);

  return { title, type, amount, category, date };
}

function validateTransactionPayload(payload) {
  if (!payload.title || !payload.type || !payload.category || !payload.date) {
    return 'Title, Type, Amount, Category, and Date are all required.';
  }
  if (payload.type !== 'income' && payload.type !== 'expense') {
    return 'Type must be either income or expense.';
  }
  if (Number.isNaN(payload.amount) || payload.amount <= 0) {
    return 'Amount must be a positive number greater than 0.';
  }
  if (!CATEGORIES.includes(payload.category)) {
    return 'Please select a valid category.';
  }
  if (!isValidIsoDate(payload.date)) {
    return 'Date must be valid (YYYY-MM-DD).';
  }
  return null;
}

// GET categories list
app.get('/api/meta', (req, res) => {
  res.json({ categories: CATEGORIES, currentMonth: getCurrentMonthPrefix() });
});

// GET transactions + monthly summary (supports ?month=YYYY-MM and ?category=...)
app.get('/api/transactions', async (req, res) => {
  try {
    const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month.trim())
      ? req.query.month.trim()
      : getCurrentMonthPrefix();
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const monthPrefixRegex = new RegExp(`^${month}-`);
    const monthEntries = await Transaction.find({ date: monthPrefixRegex }).sort({ date: -1, createdAt: -1 });

    let totalIncome = 0;
    let totalExpense = 0;
    for (const entry of monthEntries) {
      if (entry.type === 'income') totalIncome += entry.amount;
      else totalExpense += entry.amount;
    }

    const filteredTransactions =
      category && category !== 'All'
        ? monthEntries.filter((entry) => entry.category === category)
        : monthEntries;

    res.json({
      transactions: filteredTransactions,
      summary: {
        month,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netBalance: Number((totalIncome - totalExpense).toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// POST add a new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const payload = parseTransactionPayload(req.body);
    const errorMsg = validateTransactionPayload(payload);
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg });
    }

    const created = await Transaction.create(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add entry.' });
  }
});

// PUT update an existing transaction
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const payload = parseTransactionPayload(req.body);
    const errorMsg = validateTransactionPayload(payload);
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg });
    }

    const updated = await Transaction.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Transaction entry not found.' });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid transaction ID.' });
    }
    res.status(500).json({ error: 'Failed to update entry.' });
  }
});

// DELETE a transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction entry not found.' });
    }
    res.json({ message: 'Entry deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid transaction ID.' });
    }
    res.status(500).json({ error: 'Failed to delete entry.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Expense Tracker running at http://localhost:${PORT}`);
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
