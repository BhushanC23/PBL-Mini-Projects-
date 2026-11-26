const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/01-student-portal';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      required: [true, 'Roll number is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required.'],
      trim: true,
    },
    studentClass: {
      type: String,
      required: [true, 'Class is required.'],
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required.'],
      min: [0, 'Marks cannot be less than 0.'],
      max: [100, 'Marks cannot exceed 100.'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
  },
  { timestamps: true }
);

const Student = mongoose.model('Student', studentSchema);

const SEED_STUDENTS = [
  {
    rollNo: 'CS101',
    name: 'Aarav Sharma',
    studentClass: 'TY-CS',
    marks: 86,
    email: 'aarav.sharma@college.edu',
  },
  {
    rollNo: 'CS102',
    name: 'Priya Nair',
    studentClass: 'TY-CS',
    marks: 74,
    email: 'priya.nair@college.edu',
  },
  {
    rollNo: 'CS103',
    name: 'Rohan Kulkarni',
    studentClass: 'SY-IT',
    marks: 34,
    email: 'rohan.kulkarni@college.edu',
  },
  {
    rollNo: 'CS104',
    name: 'Sneha Patel',
    studentClass: 'TY-IT',
    marks: 91,
    email: 'sneha.patel@college.edu',
  },
  {
    rollNo: 'CS105',
    name: 'Kabir Verma',
    studentClass: 'SY-CS',
    marks: 28,
    email: 'kabir.verma@college.edu',
  },
];

async function seedIfEmpty() {
  const count = await Student.countDocuments();
  if (count === 0) {
    await Student.insertMany(SEED_STUDENTS);
    console.log('Seeded 5 sample student records.');
  }
}

function formatError(err) {
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (field === 'rollNo') {
      return { status: 409, message: 'Duplicate blocked: A student with this Roll No. already exists.' };
    }
    if (field === 'email') {
      return { status: 409, message: 'Duplicate blocked: A student with this Email already exists.' };
    }
    return { status: 409, message: 'Duplicate blocked: Roll No. or Email already exists.' };
  }

  if (err.name === 'ValidationError') {
    const firstMsg = Object.values(err.errors).map((e) => e.message)[0];
    return { status: 400, message: firstMsg || 'Validation failed.' };
  }

  if (err.name === 'CastError') {
    return { status: 400, message: 'Invalid student ID or numeric field format.' };
  }

  return { status: 500, message: 'Server error while processing request.' };
}

function parseStudentPayload(body) {
  const rollNo = typeof body.rollNo === 'string' ? body.rollNo.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const studentClass = typeof body.studentClass === 'string' ? body.studentClass.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const marks = body.marks === '' || body.marks === null || body.marks === undefined
    ? NaN
    : Number(body.marks);

  return { rollNo, name, studentClass, marks, email };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET all students (supports live search via ?q=...)
app.get('/api/students', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let filter = {};

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter = {
        $or: [
          { rollNo: regex },
          { name: regex },
          { studentClass: regex },
          { email: regex },
        ],
      };
    }

    const students = await Student.find(filter).sort({ rollNo: 1, createdAt: -1 });
    res.json(students);
  } catch (err) {
    const { status, message } = formatError(err);
    res.status(status).json({ error: message });
  }
});

// POST create a new student
app.post('/api/students', async (req, res) => {
  try {
    const payload = parseStudentPayload(req.body);
    if (Number.isNaN(payload.marks)) {
      return res.status(400).json({ error: 'Marks must be a valid number between 0 and 100.' });
    }

    const student = await Student.create(payload);
    res.status(201).json(student);
  } catch (err) {
    const { status, message } = formatError(err);
    res.status(status).json({ error: message });
  }
});

// PUT update an existing student
app.put('/api/students/:id', async (req, res) => {
  try {
    const payload = parseStudentPayload(req.body);
    if (Number.isNaN(payload.marks)) {
      return res.status(400).json({ error: 'Marks must be a valid number between 0 and 100.' });
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    res.json(updated);
  } catch (err) {
    const { status, message } = formatError(err);
    res.status(status).json({ error: message });
  }
});

// DELETE a student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    res.json({ message: 'Student record deleted successfully.' });
  } catch (err) {
    const { status, message } = formatError(err);
    res.status(status).json({ error: message });
  }
});

// Serve SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Student.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Student Portal running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('\nMongoDB is not running on 127.0.0.1:27017.');
      console.error('Start the MongoDB Windows service in an Administrator terminal:');
      console.error('  net start MongoDB\n');
    }
    process.exit(1);
  }
}

startServer();
