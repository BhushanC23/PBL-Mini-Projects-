const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/03-library-management';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bookSchema = new mongoose.Schema(
  {
    isbn: {
      type: String,
      required: [true, 'ISBN / Book Code is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required.'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required.'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Issued'],
      default: 'Available',
    },
    issuedTo: {
      memberName: { type: String, default: null },
      memberId: { type: String, default: null },
      issuedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const Book = mongoose.model('Book', bookSchema);

const SEED_BOOKS = [
  {
    isbn: 'LIB-101',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    category: 'Computer Science',
    status: 'Available',
    issuedTo: { memberName: null, memberId: null, issuedAt: null },
  },
  {
    isbn: 'LIB-102',
    title: 'Operating System Concepts',
    author: 'Abraham Silberschatz',
    category: 'Computer Science',
    status: 'Issued',
    issuedTo: {
      memberName: 'Aarav Sharma',
      memberId: 'MEM-204',
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  },
  {
    isbn: 'LIB-103',
    title: 'Database System Concepts',
    author: 'Henry F. Korth',
    category: 'Databases',
    status: 'Available',
    issuedTo: { memberName: null, memberId: null, issuedAt: null },
  },
  {
    isbn: 'LIB-104',
    title: 'Computer Networks',
    author: 'Andrew S. Tanenbaum',
    category: 'Networking',
    status: 'Issued',
    issuedTo: {
      memberName: 'Priya Nair',
      memberId: 'MEM-118',
      issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  },
  {
    isbn: 'LIB-105',
    title: 'Software Engineering',
    author: 'Ian Sommerville',
    category: 'Software',
    status: 'Available',
    issuedTo: { memberName: null, memberId: null, issuedAt: null },
  },
];

async function seedIfEmpty() {
  const count = await Book.countDocuments();
  if (count === 0) {
    await Book.insertMany(SEED_BOOKS);
    console.log('Seeded 5 sample library books.');
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET all books (supports optional ?status=Available|Issued and ?q=search)
app.get('/api/books', async (req, res) => {
  try {
    const filter = {};
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (status === 'Available' || status === 'Issued') {
      filter.status = status;
    }

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { isbn: regex },
        { title: regex },
        { author: regex },
        { category: regex },
        { 'issuedTo.memberName': regex },
        { 'issuedTo.memberId': regex },
      ];
    }

    const books = await Book.find(filter).sort({ isbn: 1, createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load library books.' });
  }
});

// POST add a new book
app.post('/api/books', async (req, res) => {
  try {
    const isbn = typeof req.body.isbn === 'string' ? req.body.isbn.trim() : '';
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const author = typeof req.body.author === 'string' ? req.body.author.trim() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';

    if (!isbn || !title || !author || !category) {
      return res.status(400).json({ error: 'ISBN, Title, Author, and Category are all required.' });
    }

    const book = await Book.create({
      isbn,
      title,
      author,
      category,
      status: 'Available',
      issuedTo: { memberName: null, memberId: null, issuedAt: null },
    });

    res.status(201).json(book);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: A book with this ISBN already exists.' });
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message)[0];
      return res.status(400).json({ error: msg || 'Validation failed.' });
    }
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

// POST issue a book to a member (strictly prevents issuing an already-issued book)
app.post('/api/books/:id/issue', async (req, res) => {
  try {
    const memberName = typeof req.body.memberName === 'string' ? req.body.memberName.trim() : '';
    const memberId = typeof req.body.memberId === 'string' ? req.body.memberId.trim().toUpperCase() : '';

    if (!memberName || !memberId) {
      return res.status(400).json({ error: 'Member Name and Member ID are required to issue a book.' });
    }

    const updated = await Book.findOneAndUpdate(
      { _id: req.params.id, status: 'Available' },
      {
        $set: {
          status: 'Issued',
          issuedTo: {
            memberName,
            memberId,
            issuedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await Book.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Book not found.' });
      }
      const holder = existing.issuedTo?.memberName
        ? `${existing.issuedTo.memberName} (${existing.issuedTo.memberId})`
        : 'another member';
      return res.status(409).json({
        error: `Issue rejected: "${existing.title}" (${existing.isbn}) is already issued to ${holder}.`,
      });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }
    res.status(500).json({ error: 'Failed to issue book.' });
  }
});

// POST return an issued book
app.post('/api/books/:id/return', async (req, res) => {
  try {
    const updated = await Book.findOneAndUpdate(
      { _id: req.params.id, status: 'Issued' },
      {
        $set: {
          status: 'Available',
          issuedTo: {
            memberName: null,
            memberId: null,
            issuedAt: null,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await Book.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Book not found.' });
      }
      return res.status(400).json({
        error: `"${existing.title}" is already Available in the library.`,
      });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }
    res.status(500).json({ error: 'Failed to return book.' });
  }
});

// DELETE a book (only if not currently issued)
app.delete('/api/books/:id', async (req, res) => {
  try {
    const existing = await Book.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    if (existing.status === 'Issued') {
      return res.status(409).json({
        error: `Cannot delete "${existing.title}" while it is issued. Return the book first.`,
      });
    }

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: 'Book deleted successfully.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid book ID.' });
    }
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Book.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Library Management running at http://localhost:${PORT}`);
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
