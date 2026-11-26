const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/14-complaint-management';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORIES = [
  'IT & Wi-Fi',
  'Hostel & Maintenance',
  'Academics',
  'Canteen',
  'Transport',
  'General Feedback',
];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

const complaintSchema = new mongoose.Schema(
  {
    ticketCode: { type: String, required: true, unique: true, trim: true },
    reporterName: { type: String, required: true, trim: true },
    reporterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    category: { type: String, enum: CATEGORIES, required: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: STATUSES, default: 'Open' },
  },
  { timestamps: true }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

const SEED_COMPLAINTS = [
  {
    ticketCode: 'CMP-1001',
    reporterName: 'Aarav Sharma',
    reporterEmail: 'aarav.sharma@college.edu',
    category: 'IT & Wi-Fi',
    priority: 'High',
    subject: 'Wi-Fi drops frequently in CS Lab 2',
    description: 'Students lose connection every 10 minutes during afternoon practical sessions.',
    status: 'Open',
  },
  {
    ticketCode: 'CMP-1002',
    reporterName: 'Priya Nair',
    reporterEmail: 'priya.nair@college.edu',
    category: 'Hostel & Maintenance',
    priority: 'High',
    subject: 'Water cooler not cooling on 2nd floor',
    description: 'The corridor water cooler near Room B-204 has stopped cooling since yesterday.',
    status: 'In Progress',
  },
  {
    ticketCode: 'CMP-1003',
    reporterName: 'Rohan Kulkarni',
    reporterEmail: 'rohan.kulkarni@college.edu',
    category: 'Canteen',
    priority: 'Medium',
    subject: 'Suggestion for evening snacks menu',
    description: 'Adding more South Indian breakfast/snack options after 4 PM would help hostelers.',
    status: 'Open',
  },
  {
    ticketCode: 'CMP-1004',
    reporterName: 'Sneha Patel',
    reporterEmail: 'sneha.patel@college.edu',
    category: 'Academics',
    priority: 'Low',
    subject: 'Projector focus blurry in Hall 305',
    description: 'Lecture slides appear out of focus on the right side of the screen.',
    status: 'Resolved',
  },
  {
    ticketCode: 'CMP-1005',
    reporterName: 'Kabir Verma',
    reporterEmail: 'kabir.verma@college.edu',
    category: 'Transport',
    priority: 'Medium',
    subject: 'Bus Route 4 arrives 10 minutes late',
    description: 'Morning pickup at Station Road is consistently delayed during peak traffic.',
    status: 'In Progress',
  },
];

async function seedIfEmpty() {
  const count = await Complaint.countDocuments();
  if (count === 0) {
    await Complaint.insertMany(SEED_COMPLAINTS);
    console.log('Seeded 5 sample complaints.');
  }
}

async function generateTicketCode() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const candidate = `CMP-${randomDigits}`;
  const exists = await Complaint.exists({ ticketCode: candidate });
  return exists ? `CMP-${Date.now().toString().slice(-5)}` : candidate;
}

// GET metadata
app.get('/api/meta', (req, res) => {
  res.json({ categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });
});

// GET complaints (supports ?status=Open|In Progress|Resolved) and status counts
app.get('/api/complaints', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const filter = STATUSES.includes(status) ? { status } : {};

    const [complaints, allStatuses] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }),
      Complaint.find().select('status').lean(),
    ]);

    const counts = {
      All: allStatuses.length,
      Open: allStatuses.filter((c) => c.status === 'Open').length,
      'In Progress': allStatuses.filter((c) => c.status === 'In Progress').length,
      Resolved: allStatuses.filter((c) => c.status === 'Resolved').length,
    };

    res.json({ complaints, counts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load complaints.' });
  }
});

// POST submit a new complaint/feedback
app.post('/api/complaints', async (req, res) => {
  try {
    const reporterName = typeof req.body.reporterName === 'string' ? req.body.reporterName.trim() : '';
    const reporterEmail = typeof req.body.reporterEmail === 'string' ? req.body.reporterEmail.trim().toLowerCase() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    const priority = typeof req.body.priority === 'string' ? req.body.priority.trim() : '';
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!reporterName || !reporterEmail || !category || !priority || !subject || !description) {
      return res.status(400).json({ error: 'All fields are required to submit a complaint.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category selected.' });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority selected.' });
    }

    const ticketCode = await generateTicketCode();
    const created = await Complaint.create({
      ticketCode,
      reporterName,
      reporterEmail,
      category,
      priority,
      subject,
      description,
      status: 'Open',
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

// PATCH Admin updates complaint status (Open, In Progress, Resolved)
app.patch('/api/complaints/:id/status', async (req, res) => {
  try {
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be Open, In Progress, or Resolved.' });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    res.status(500).json({ error: 'Failed to update complaint status.' });
  }
});

// DELETE a complaint
app.delete('/api/complaints/:id', async (req, res) => {
  try {
    const deleted = await Complaint.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }
    res.json({ message: 'Complaint deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid complaint ID.' });
    }
    res.status(500).json({ error: 'Failed to delete complaint.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Complaint.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Complaint Management running at http://localhost:${PORT}`);
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
