const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/09-notes-auth';
const JWT_SECRET = process.env.JWT_SECRET || 'college-notes-jwt-secret-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const userSchema = new mongoose.Schema(
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
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const noteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const salt = await bcrypt.genSalt(10);
  const passHash = await bcrypt.hash('pass123', salt);

  const [aarav, priya] = await User.insertMany([
    {
      name: 'Aarav Sharma',
      email: 'aarav@college.edu',
      passwordHash: passHash,
    },
    {
      name: 'Priya Nair',
      email: 'priya@college.edu',
      passwordHash: passHash,
    },
  ]);

  await Note.insertMany([
    {
      owner: aarav._id,
      title: 'Operating Systems Unit 3 Revision',
      category: 'Study',
      content: 'Review deadlock prevention, Banker algorithm safety check, and paging vs segmentation.',
    },
    {
      owner: aarav._id,
      title: 'Mini-Project Viva Checklist',
      category: 'College',
      content: 'Demonstrate MongoDB persistence, JWT auth header verification, and user data isolation.',
    },
    {
      owner: priya._id,
      title: 'DBMS Normalization Notes',
      category: 'Study',
      content: '1NF eliminates repeating groups; 2NF removes partial dependencies; 3NF removes transitive dependencies.',
    },
    {
      owner: priya._id,
      title: 'Weekend Hackathon Ideas',
      category: 'Ideas',
      content: 'Build a campus carpool matcher or smart canteen pre-order web app.',
    },
  ]);

  console.log('Seeded 2 demo users and 4 sample private notes.');
}

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email, and Password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST login
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and Password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

// GET current logged-in user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id name email');
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify session.' });
  }
});

// GET only the logged-in user's notes
app.get('/api/notes', requireAuth, async (req, res) => {
  try {
    const filter = { owner: req.userId };
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: regex }, { category: regex }, { content: regex }];
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load your notes.' });
  }
});

// POST create a note owned by the logged-in user
app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const category = typeof req.body.category === 'string' && req.body.category.trim()
      ? req.body.category.trim()
      : 'General';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and Content are required.' });
    }

    const note = await Note.create({
      owner: req.userId,
      title,
      category,
      content,
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note.' });
  }
});

// PUT edit a note (strictly checks ownership)
app.put('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const category = typeof req.body.category === 'string' && req.body.category.trim()
      ? req.body.category.trim()
      : 'General';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and Content are required.' });
    }

    const existing = await Note.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    if (existing.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied: You can only edit your own notes.' });
    }

    existing.title = title;
    existing.category = category;
    existing.content = content;
    await existing.save();

    res.json(existing);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// DELETE a note (strictly checks ownership)
app.delete('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const existing = await Note.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    if (existing.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own notes.' });
    }

    await Note.deleteOne({ _id: existing._id });
    res.json({ message: 'Note deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await User.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Notes Auth App running at http://localhost:${PORT}`);
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
