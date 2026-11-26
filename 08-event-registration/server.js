const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/08-event-registration';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const EVENTS = [
  'Tech Symposium 2026',
  'AI & ML Workshop',
  'Hackathon 24H',
  'UI/UX Design Sprint',
  'Cybersecurity Bootcamp',
];

const registrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, 'Mobile number must be exactly 10 digits.'],
    },
    event: { type: String, enum: EVENTS, required: true },
  },
  { timestamps: true }
);

const Registration = mongoose.model('Registration', registrationSchema);

const SEED_REGISTRANTS = [
  {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@college.edu',
    mobile: '9876543210',
    event: 'Hackathon 24H',
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@college.edu',
    mobile: '9823456789',
    event: 'AI & ML Workshop',
  },
  {
    name: 'Rohan Kulkarni',
    email: 'rohan.kulkarni@college.edu',
    mobile: '9765432109',
    event: 'Tech Symposium 2026',
  },
  {
    name: 'Sneha Patel',
    email: 'sneha.patel@college.edu',
    mobile: '9890123456',
    event: 'UI/UX Design Sprint',
  },
  {
    name: 'Kabir Verma',
    email: 'kabir.verma@college.edu',
    mobile: '9811223344',
    event: 'Cybersecurity Bootcamp',
  },
];

async function seedIfEmpty() {
  const count = await Registration.countDocuments();
  if (count === 0) {
    await Registration.insertMany(SEED_REGISTRANTS);
    console.log('Seeded 5 sample event registrants.');
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET events list
app.get('/api/events', (req, res) => {
  res.json({ events: EVENTS });
});

// GET all registrants (Admin view, supports optional ?event= and ?q=)
app.get('/api/registrations', async (req, res) => {
  try {
    const filter = {};
    const event = typeof req.query.event === 'string' ? req.query.event.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (event && event !== 'All') {
      filter.event = event;
    }

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { mobile: regex }, { event: regex }];
    }

    const registrants = await Registration.find(filter).sort({ createdAt: -1 });
    res.json(registrants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load registrants.' });
  }
});

// POST register participant (strictly blocks duplicate emails)
app.post('/api/registrations', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const mobile = typeof req.body.mobile === 'string' ? req.body.mobile.trim() : '';
    const event = typeof req.body.event === 'string' ? req.body.event.trim() : '';

    if (!name || !email || !mobile || !event) {
      return res.status(400).json({ error: 'Name, Email, Mobile, and Event are all required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile number must be exactly 10 digits.' });
    }

    if (!EVENTS.includes(event)) {
      return res.status(400).json({ error: 'Please select a valid event.' });
    }

    const existing = await Registration.findOne({ email });
    if (existing) {
      return res.status(409).json({
        error: `Duplicate blocked: "${email}" is already registered for ${existing.event}.`,
      });
    }

    const created = await Registration.create({ name, email, mobile, event });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate blocked: This email address is already registered.',
      });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message)[0];
      return res.status(400).json({ error: msg || 'Validation failed.' });
    }
    res.status(500).json({ error: 'Failed to submit registration.' });
  }
});

// DELETE a registration (Admin)
app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const deleted = await Registration.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }
    res.json({ message: 'Registration removed.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid registration ID.' });
    }
    res.status(500).json({ error: 'Failed to remove registration.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Registration.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Event Registration running at http://localhost:${PORT}`);
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
