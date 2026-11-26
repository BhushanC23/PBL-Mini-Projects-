const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/05-hospital-appointment';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DOCTORS = [
  'Dr. Meera Iyer (Cardiology)',
  'Dr. Vikram Rao (Orthopedics)',
  'Dr. Anjali Nair (Dermatology)',
  'Dr. Arjun Deshmukh (General Medicine)',
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
];

const appointmentSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true, trim: true },
    doctor: { type: String, enum: DOCTORS, required: true },
    date: { type: String, required: true, trim: true },
    timeSlot: { type: String, enum: TIME_SLOTS, required: true },
  },
  { timestamps: true }
);

// Enforce strict uniqueness at the database level as well
appointmentSchema.index({ doctor: 1, date: 1, timeSlot: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

function addDaysIso(daysAhead) {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function seedIfEmpty() {
  const count = await Appointment.countDocuments();
  if (count === 0) {
    const seedAppointments = [
      {
        patientName: 'Aarav Sharma',
        doctor: DOCTORS[0],
        date: addDaysIso(1),
        timeSlot: '10:00 AM',
      },
      {
        patientName: 'Priya Nair',
        doctor: DOCTORS[1],
        date: addDaysIso(1),
        timeSlot: '11:00 AM',
      },
      {
        patientName: 'Rohan Kulkarni',
        doctor: DOCTORS[2],
        date: addDaysIso(2),
        timeSlot: '02:00 PM',
      },
      {
        patientName: 'Sneha Patel',
        doctor: DOCTORS[3],
        date: addDaysIso(3),
        timeSlot: '09:00 AM',
      },
      {
        patientName: 'Kabir Verma',
        doctor: DOCTORS[0],
        date: addDaysIso(4),
        timeSlot: '03:00 PM',
      },
    ];
    await Appointment.insertMany(seedAppointments);
    console.log('Seeded 5 sample upcoming appointments.');
  }
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

function slotRank(slot) {
  const idx = TIME_SLOTS.indexOf(slot);
  return idx === -1 ? 99 : idx;
}

// GET doctors & time slots metadata
app.get('/api/meta', (req, res) => {
  res.json({ doctors: DOCTORS, timeSlots: TIME_SLOTS });
});

// GET upcoming appointments (date >= today, optional ?doctor= filter)
app.get('/api/appointments', async (req, res) => {
  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    const doctor = typeof req.query.doctor === 'string' ? req.query.doctor.trim() : '';

    const filter = { date: { $gte: todayIso } };
    if (doctor && doctor !== 'All') {
      filter.doctor = doctor;
    }

    const appointments = await Appointment.find(filter).sort({ date: 1, createdAt: 1 });
    appointments.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return slotRank(a.timeSlot) - slotRank(b.timeSlot);
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load appointments.' });
  }
});

// POST book a new appointment (strictly rejects double booking)
app.post('/api/appointments', async (req, res) => {
  try {
    const patientName = typeof req.body.patientName === 'string' ? req.body.patientName.trim() : '';
    const doctor = typeof req.body.doctor === 'string' ? req.body.doctor.trim() : '';
    const date = typeof req.body.date === 'string' ? req.body.date.trim() : '';
    const timeSlot = typeof req.body.timeSlot === 'string' ? req.body.timeSlot.trim() : '';

    if (!patientName || !doctor || !date || !timeSlot) {
      return res.status(400).json({
        error: 'Patient Name, Doctor, Date, and Time Slot are all required.',
      });
    }

    if (!DOCTORS.includes(doctor)) {
      return res.status(400).json({ error: 'Please select a valid doctor.' });
    }

    if (!TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ error: 'Please select a valid time slot.' });
    }

    if (!isValidIsoDate(date)) {
      return res.status(400).json({ error: 'Please provide a valid date (YYYY-MM-DD).' });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    if (date < todayIso) {
      return res.status(400).json({
        error: 'Validation error: Appointment date cannot be in the past.',
      });
    }

    const conflict = await Appointment.findOne({ doctor, date, timeSlot });
    if (conflict) {
      return res.status(409).json({
        error: `Double booking rejected: ${doctor} is already booked on ${date} at ${timeSlot}. Please choose another slot or doctor.`,
      });
    }

    const created = await Appointment.create({
      patientName,
      doctor,
      date,
      timeSlot,
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Double booking rejected: This doctor is already booked for the selected date and time slot.',
      });
    }
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// DELETE cancel an appointment
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid appointment ID.' });
    }
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Appointment.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Hospital Appointment System running at http://localhost:${PORT}`);
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
