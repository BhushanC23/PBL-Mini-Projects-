const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/11-job-portal';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JOB_TYPES = ['Internship', 'Full-Time', 'Part-Time'];

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    jobType: { type: String, enum: JOB_TYPES, required: true },
    salary: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    branch: { type: String, required: true, trim: true },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    coverNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, studentEmail: 1 }, { unique: true });

const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);

async function seedIfEmpty() {
  const count = await Job.countDocuments();
  if (count > 0) return;

  const jobs = await Job.insertMany([
    {
      title: 'Frontend Web Intern',
      company: 'PixelCraft Labs',
      location: 'Pune',
      jobType: 'Internship',
      salary: '15,000 / month',
      description: 'Build responsive HTML, Tailwind CSS, and JavaScript interfaces for client portals.',
    },
    {
      title: 'Junior Node.js Developer',
      company: 'CloudBridge Tech',
      location: 'Bengaluru',
      jobType: 'Full-Time',
      salary: '5.5 LPA',
      description: 'Develop REST APIs using Express.js, MongoDB, and Mongoose with clean validation.',
    },
    {
      title: 'Data Analyst Intern',
      company: 'MetricPulse Analytics',
      location: 'Mumbai',
      jobType: 'Internship',
      salary: '18,000 / month',
      description: 'Analyze product datasets, build SQL/Mongo aggregations, and prepare weekly reports.',
    },
    {
      title: 'QA & Testing Engineer',
      company: 'FinSafe Systems',
      location: 'Hyderabad',
      jobType: 'Full-Time',
      salary: '4.8 LPA',
      description: 'Write API integration test suites and verify UI workflows across releases.',
    },
    {
      title: 'Technical Support Associate',
      company: 'EduServe Solutions',
      location: 'Remote',
      jobType: 'Part-Time',
      salary: '12,000 / month',
      description: 'Assist college users with onboarding, troubleshooting, and documentation.',
    },
  ]);

  await Application.insertMany([
    {
      job: jobs[0]._id,
      studentName: 'Aarav Sharma',
      studentEmail: 'aarav.sharma@college.edu',
      branch: 'TY-CS',
      cgpa: 8.6,
      coverNote: 'Built 5 full-stack mini projects using Node.js and Tailwind CSS.',
    },
    {
      job: jobs[1]._id,
      studentName: 'Priya Nair',
      studentEmail: 'priya.nair@college.edu',
      branch: 'BE-IT',
      cgpa: 9.1,
      coverNote: 'Experienced with Express REST APIs and MongoDB schema design.',
    },
  ]);

  console.log('Seeded 5 sample jobs and 2 sample applications.');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET jobs (supports ?q= searching title, location, or company)
app.get('/api/jobs', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let filter = {};
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i');
      filter = { $or: [{ title: regex }, { location: regex }, { company: regex }] };
    }

    const [jobs, counts] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).lean(),
      Application.aggregate([{ $group: { _id: '$job', count: { $sum: 1 } } }]),
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const enriched = jobs.map((j) => ({
      ...j,
      applicationCount: countMap.get(String(j._id)) || 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs.' });
  }
});

// POST recruiter creates a job
app.post('/api/jobs', async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const company = typeof req.body.company === 'string' ? req.body.company.trim() : '';
    const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';
    const jobType = typeof req.body.jobType === 'string' ? req.body.jobType.trim() : '';
    const salary = typeof req.body.salary === 'string' ? req.body.salary.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!title || !company || !location || !jobType || !salary || !description) {
      return res.status(400).json({ error: 'All job fields are required.' });
    }
    if (!JOB_TYPES.includes(jobType)) {
      return res.status(400).json({ error: 'Invalid job type.' });
    }

    const job = await Job.create({ title, company, location, jobType, salary, description });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post job.' });
  }
});

// DELETE recruiter removes a job and its applications
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const deleted = await Job.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    await Application.deleteMany({ job: deleted._id });
    res.json({ message: 'Job removed.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID.' });
    }
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// GET all applications for Recruiter view
app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('job', 'title company location jobType')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// POST student applies for a job
app.post('/api/jobs/:id/apply', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Selected job no longer exists.' });
    }

    const studentName = typeof req.body.studentName === 'string' ? req.body.studentName.trim() : '';
    const studentEmail = typeof req.body.studentEmail === 'string' ? req.body.studentEmail.trim().toLowerCase() : '';
    const branch = typeof req.body.branch === 'string' ? req.body.branch.trim() : '';
    const coverNote = typeof req.body.coverNote === 'string' ? req.body.coverNote.trim() : '';
    const cgpa = req.body.cgpa === '' || req.body.cgpa === null || req.body.cgpa === undefined
      ? NaN
      : Number(req.body.cgpa);

    if (!studentName || !studentEmail || !branch || Number.isNaN(cgpa)) {
      return res.status(400).json({ error: 'Student Name, Email, Branch, and CGPA are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return res.status(400).json({ error: 'Please enter a valid student email address.' });
    }
    if (cgpa < 0 || cgpa > 10) {
      return res.status(400).json({ error: 'CGPA must be between 0 and 10.' });
    }

    const existing = await Application.findOne({ job: job._id, studentEmail });
    if (existing) {
      return res.status(409).json({
        error: `Already applied: "${studentEmail}" has already applied for "${job.title}".`,
      });
    }

    const application = await Application.create({
      job: job._id,
      studentName,
      studentEmail,
      branch,
      cgpa,
      coverNote,
    });

    res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: You have already applied for this job.' });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid job ID.' });
    }
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Application.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Campus Job Portal running at http://localhost:${PORT}`);
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
