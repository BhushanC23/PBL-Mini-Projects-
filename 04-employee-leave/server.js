const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/04-employee-leave';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid'];
const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true, uppercase: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: LEAVE_STATUSES, default: 'Pending' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

const SEED_LEAVES = [
  {
    employeeName: 'Aarav Sharma',
    employeeId: 'EMP-101',
    leaveType: 'Casual',
    startDate: '2026-12-02',
    endDate: '2026-12-03',
    days: 2,
    reason: 'Attending sister’s graduation ceremony out of town.',
    status: 'Pending',
  },
  {
    employeeName: 'Priya Nair',
    employeeId: 'EMP-104',
    leaveType: 'Sick',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
    days: 2,
    reason: 'Viral fever and doctor-advised rest.',
    status: 'Pending',
  },
  {
    employeeName: 'Rohan Kulkarni',
    employeeId: 'EMP-108',
    leaveType: 'Earned',
    startDate: '2026-12-10',
    endDate: '2026-12-14',
    days: 5,
    reason: 'Annual family vacation planned in advance.',
    status: 'Approved',
    reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    employeeName: 'Sneha Patel',
    employeeId: 'EMP-112',
    leaveType: 'Casual',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    days: 1,
    reason: 'Personal bank and documentation work.',
    status: 'Rejected',
    reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    employeeName: 'Kabir Verma',
    employeeId: 'EMP-115',
    leaveType: 'Sick',
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    days: 2,
    reason: 'Dental surgery follow-up appointment.',
    status: 'Approved',
    reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
];

async function seedIfEmpty() {
  const count = await LeaveRequest.countDocuments();
  if (count === 0) {
    await LeaveRequest.insertMany(SEED_LEAVES);
    console.log('Seeded 5 sample employee leave requests.');
  }
}

function parseIsoDateOnly(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return null;
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return utc;
}

// GET all leave requests (optional ?status=Pending|Approved|Rejected)
app.get('/api/leaves', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const filter = LEAVE_STATUSES.includes(status) ? { status } : {};
    const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leave requests.' });
  }
});

// POST submit a new leave request
app.post('/api/leaves', async (req, res) => {
  try {
    const employeeName = typeof req.body.employeeName === 'string' ? req.body.employeeName.trim() : '';
    const employeeId = typeof req.body.employeeId === 'string' ? req.body.employeeId.trim().toUpperCase() : '';
    const leaveType = typeof req.body.leaveType === 'string' ? req.body.leaveType.trim() : '';
    const startDate = typeof req.body.startDate === 'string' ? req.body.startDate.trim() : '';
    const endDate = typeof req.body.endDate === 'string' ? req.body.endDate.trim() : '';
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    if (!employeeName || !employeeId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'All fields are required to submit a leave application.' });
    }

    if (!LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({ error: 'Invalid leave type selected.' });
    }

    const startUtc = parseIsoDateOnly(startDate);
    const endUtc = parseIsoDateOnly(endDate);
    if (!startUtc || !endUtc) {
      return res.status(400).json({ error: 'Start Date and End Date must be valid dates (YYYY-MM-DD).' });
    }

    if (endUtc < startUtc) {
      return res.status(400).json({
        error: 'Validation error: End date cannot be before start date.',
      });
    }

    const days = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;

    const created = await LeaveRequest.create({
      employeeName,
      employeeId,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      status: 'Pending',
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message)[0];
      return res.status(400).json({ error: msg || 'Validation failed.' });
    }
    res.status(500).json({ error: 'Failed to submit leave request.' });
  }
});

// PATCH approve or reject a leave request
app.patch('/api/leaves/:id/status', async (req, res) => {
  try {
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({ error: 'Status must be either Approved or Rejected.' });
    }

    const updated = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { status, reviewedAt: new Date() } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid leave request ID.' });
    }
    res.status(500).json({ error: 'Failed to update leave status.' });
  }
});

// DELETE a leave request (optional cleanup)
app.delete('/api/leaves/:id', async (req, res) => {
  try {
    const deleted = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }
    res.json({ message: 'Leave request deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid leave request ID.' });
    }
    res.status(500).json({ error: 'Failed to delete leave request.' });
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
      console.log(`Employee Leave System running at http://localhost:${PORT}`);
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
