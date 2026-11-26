const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/15-placement-portal';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const studentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    branch: { type: String, required: true, trim: true },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    skills: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const driveSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    packageLpa: { type: String, required: true, trim: true },
    minCgpa: { type: Number, required: true, min: 0, max: 10 },
    location: { type: String, required: true, trim: true },
    driveDate: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Closed'], default: 'Active' },
  },
  { timestamps: true }
);

const placementAppSchema = new mongoose.Schema(
  {
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: {
      type: String,
      enum: ['Applied', 'Selected', 'Not Selected'],
      default: 'Applied',
    },
  },
  { timestamps: true }
);

placementAppSchema.index({ drive: 1, student: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);
const Drive = mongoose.model('Drive', driveSchema);
const PlacementApp = mongoose.model('PlacementApp', placementAppSchema);

function futureDateIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function seedIfEmpty() {
  const driveCount = await Drive.countDocuments();
  const studentCount = await Student.countDocuments();
  if (driveCount > 0 || studentCount > 0) return;

  const students = await Student.insertMany([
    {
      rollNo: 'CS101',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@college.edu',
      branch: 'BE-CS',
      cgpa: 8.7,
      skills: 'Node.js, Express, MongoDB, JavaScript',
    },
    {
      rollNo: 'CS102',
      name: 'Priya Nair',
      email: 'priya.nair@college.edu',
      branch: 'BE-CS',
      cgpa: 9.2,
      skills: 'Python, SQL, REST APIs, Cloud',
    },
    {
      rollNo: 'IT201',
      name: 'Rohan Kulkarni',
      email: 'rohan.kulkarni@college.edu',
      branch: 'BE-IT',
      cgpa: 6.9,
      skills: 'HTML, CSS, Manual Testing',
    },
  ]);

  const drives = await Drive.insertMany([
    {
      companyName: 'ApexTech Systems',
      role: 'Associate Software Engineer',
      packageLpa: '6.5 LPA',
      minCgpa: 7.0,
      location: 'Pune',
      driveDate: futureDateIso(4),
      status: 'Active',
    },
    {
      companyName: 'CloudScale Solutions',
      role: 'Backend Developer Trainee',
      packageLpa: '7.5 LPA',
      minCgpa: 7.5,
      location: 'Bengaluru',
      driveDate: futureDateIso(7),
      status: 'Active',
    },
    {
      companyName: 'DataCraft Analytics',
      role: 'Junior Data Analyst',
      packageLpa: '5.2 LPA',
      minCgpa: 6.5,
      location: 'Mumbai',
      driveDate: futureDateIso(10),
      status: 'Active',
    },
    {
      companyName: 'LegacyCorp IT',
      role: 'Systems Support Engineer',
      packageLpa: '4.5 LPA',
      minCgpa: 6.0,
      location: 'Hyderabad',
      driveDate: futureDateIso(-2),
      status: 'Closed',
    },
  ]);

  await PlacementApp.insertMany([
    { drive: drives[0]._id, student: students[0]._id, status: 'Selected' },
    { drive: drives[0]._id, student: students[1]._id, status: 'Applied' },
    { drive: drives[2]._id, student: students[2]._id, status: 'Not Selected' },
  ]);

  console.log('Seeded 3 students, 4 company drives, and 3 applications.');
}

// GET all registered students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load student profiles.' });
  }
});

// POST register a new student profile
app.post('/api/students', async (req, res) => {
  try {
    const rollNo = typeof req.body.rollNo === 'string' ? req.body.rollNo.trim().toUpperCase() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const branch = typeof req.body.branch === 'string' ? req.body.branch.trim() : '';
    const skills = typeof req.body.skills === 'string' ? req.body.skills.trim() : '';
    const cgpa = req.body.cgpa === '' || req.body.cgpa === null || req.body.cgpa === undefined
      ? NaN
      : Number(req.body.cgpa);

    if (!rollNo || !name || !email || !branch || Number.isNaN(cgpa)) {
      return res.status(400).json({ error: 'Roll No., Name, Email, Branch, and CGPA are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (cgpa < 0 || cgpa > 10) {
      return res.status(400).json({ error: 'CGPA must be between 0 and 10.' });
    }

    const created = await Student.create({ rollNo, name, email, branch, cgpa, skills });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
      return res.status(409).json({
        error: field === 'rollNo'
          ? 'Duplicate blocked: A student with this Roll No. is already registered.'
          : 'Duplicate blocked: A student with this Email is already registered.',
      });
    }
    res.status(500).json({ error: 'Failed to register student.' });
  }
});

// GET all company drives with applicant counts
app.get('/api/drives', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const filter = status === 'Active' || status === 'Closed' ? { status } : {};

    const [drives, counts] = await Promise.all([
      Drive.find(filter).sort({ status: 1, driveDate: 1 }).lean(),
      PlacementApp.aggregate([{ $group: { _id: '$drive', count: { $sum: 1 } } }]),
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const enriched = drives.map((d) => ({
      ...d,
      applicantCount: countMap.get(String(d._id)) || 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load company drives.' });
  }
});

// POST create a company drive (Admin)
app.post('/api/drives', async (req, res) => {
  try {
    const companyName = typeof req.body.companyName === 'string' ? req.body.companyName.trim() : '';
    const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
    const packageLpa = typeof req.body.packageLpa === 'string' ? req.body.packageLpa.trim() : '';
    const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';
    const driveDate = typeof req.body.driveDate === 'string' ? req.body.driveDate.trim() : '';
    const minCgpa = req.body.minCgpa === '' || req.body.minCgpa === null || req.body.minCgpa === undefined
      ? NaN
      : Number(req.body.minCgpa);

    if (!companyName || !role || !packageLpa || !location || !driveDate || Number.isNaN(minCgpa)) {
      return res.status(400).json({ error: 'All company drive fields are required.' });
    }
    if (minCgpa < 0 || minCgpa > 10) {
      return res.status(400).json({ error: 'Minimum CGPA must be between 0 and 10.' });
    }

    const drive = await Drive.create({
      companyName,
      role,
      packageLpa,
      minCgpa,
      location,
      driveDate,
      status: 'Active',
    });
    res.status(201).json(drive);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create placement drive.' });
  }
});

// PATCH toggle drive status Active / Closed (Admin)
app.patch('/api/drives/:id/status', async (req, res) => {
  try {
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (status !== 'Active' && status !== 'Closed') {
      return res.status(400).json({ error: 'Drive status must be Active or Closed.' });
    }
    const updated = await Drive.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Drive not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update drive status.' });
  }
});

// POST student applies to an active drive
app.post('/api/drives/:id/apply', async (req, res) => {
  try {
    const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : '';
    if (!studentId) {
      return res.status(400).json({ error: 'Please select or register a student profile first.' });
    }

    const [drive, student] = await Promise.all([
      Drive.findById(req.params.id),
      Student.findById(studentId),
    ]);

    if (!drive) return res.status(404).json({ error: 'Placement drive not found.' });
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    if (drive.status !== 'Active') {
      return res.status(400).json({
        error: `Drive closed: ${drive.companyName} (${drive.role}) is no longer accepting applications.`,
      });
    }

    if (student.cgpa < drive.minCgpa) {
      return res.status(400).json({
        error: `Eligibility not met: ${drive.companyName} requires minimum ${drive.minCgpa} CGPA (your CGPA is ${student.cgpa}).`,
      });
    }

    const existing = await PlacementApp.findOne({ drive: drive._id, student: student._id });
    if (existing) {
      return res.status(409).json({
        error: `Already applied: ${student.name} (${student.rollNo}) has already applied to ${drive.companyName}.`,
      });
    }

    const appDoc = await PlacementApp.create({
      drive: drive._id,
      student: student._id,
      status: 'Applied',
    });

    res.status(201).json(appDoc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: Already applied to this drive.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid drive or student ID.' });
    }
    res.status(500).json({ error: 'Failed to apply for placement drive.' });
  }
});

// GET applications (optional ?driveId= or ?studentId=)
app.get('/api/applications', async (req, res) => {
  try {
    const filter = {};
    if (typeof req.query.driveId === 'string' && req.query.driveId.trim()) {
      filter.drive = req.query.driveId.trim();
    }
    if (typeof req.query.studentId === 'string' && req.query.studentId.trim()) {
      filter.student = req.query.studentId.trim();
    }

    const apps = await PlacementApp.find(filter)
      .populate('drive', 'companyName role packageLpa location driveDate status')
      .populate('student', 'rollNo name email branch cgpa skills')
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// PATCH Admin marks applicant as Selected or Not Selected
app.patch('/api/applications/:id/status', async (req, res) => {
  try {
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (status !== 'Selected' && status !== 'Not Selected') {
      return res.status(400).json({ error: 'Status must be Selected or Not Selected.' });
    }

    const updated = await PlacementApp.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    )
      .populate('student', 'rollNo name')
      .populate('drive', 'companyName role');

    if (!updated) return res.status(404).json({ error: 'Application not found.' });
    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid application ID.' });
    }
    res.status(500).json({ error: 'Failed to update selection status.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Student.init();
    await PlacementApp.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Placement Portal running at http://localhost:${PORT}`);
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
