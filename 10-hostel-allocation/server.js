const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/10-hostel-allocation';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Quad'];

const occupantSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true, uppercase: true },
    allocatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: { type: String, enum: ROOM_TYPES, required: true },
    capacity: { type: Number, required: true, min: 1, max: 10 },
    occupants: { type: [occupantSchema], default: [] },
  },
  { timestamps: true }
);

const Room = mongoose.model('Room', roomSchema);

const SEED_ROOMS = [
  {
    roomNumber: 'A-101',
    type: 'Single',
    capacity: 1,
    occupants: [{ studentName: 'Aarav Sharma', rollNo: 'CS101' }],
  },
  {
    roomNumber: 'A-102',
    type: 'Double',
    capacity: 2,
    occupants: [{ studentName: 'Priya Nair', rollNo: 'CS102' }],
  },
  {
    roomNumber: 'A-103',
    type: 'Double',
    capacity: 2,
    occupants: [],
  },
  {
    roomNumber: 'B-201',
    type: 'Triple',
    capacity: 3,
    occupants: [
      { studentName: 'Rohan Kulkarni', rollNo: 'IT201' },
      { studentName: 'Kabir Verma', rollNo: 'IT202' },
      { studentName: 'Vikram Joshi', rollNo: 'IT203' },
    ],
  },
  {
    roomNumber: 'B-202',
    type: 'Triple',
    capacity: 3,
    occupants: [],
  },
];

async function seedIfEmpty() {
  const count = await Room.countDocuments();
  if (count === 0) {
    await Room.insertMany(SEED_ROOMS);
    console.log('Seeded 5 sample hostel rooms.');
  }
}

// GET all rooms (optional ?filter=vacant|occupied|full)
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    const filterParam = typeof req.query.filter === 'string' ? req.query.filter.trim().toLowerCase() : 'all';

    const enriched = rooms.map((r) => {
      const occupancyCount = r.occupants.length;
      const isVacant = occupancyCount === 0;
      const isFull = occupancyCount >= r.capacity;
      return {
        _id: r._id,
        roomNumber: r.roomNumber,
        type: r.type,
        capacity: r.capacity,
        occupancyCount,
        availableBeds: Math.max(0, r.capacity - occupancyCount),
        status: isVacant ? 'Vacant' : isFull ? 'Full' : 'Occupied',
        occupants: r.occupants,
      };
    });

    let visibleRooms = enriched;
    if (filterParam === 'vacant') {
      visibleRooms = enriched.filter((r) => r.occupancyCount === 0);
    } else if (filterParam === 'occupied') {
      visibleRooms = enriched.filter((r) => r.occupancyCount > 0);
    } else if (filterParam === 'full') {
      visibleRooms = enriched.filter((r) => r.occupancyCount >= r.capacity);
    }

    const totalBeds = enriched.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupiedBeds = enriched.reduce((sum, r) => sum + r.occupancyCount, 0);

    res.json({
      rooms: visibleRooms,
      allRooms: enriched,
      summary: {
        totalRooms: enriched.length,
        vacantRooms: enriched.filter((r) => r.occupancyCount === 0).length,
        occupiedRooms: enriched.filter((r) => r.occupancyCount > 0).length,
        fullRooms: enriched.filter((r) => r.occupancyCount >= r.capacity).length,
        totalBeds,
        totalOccupiedBeds,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load hostel rooms.' });
  }
});

// POST add a new hostel room
app.post('/api/rooms', async (req, res) => {
  try {
    const roomNumber = typeof req.body.roomNumber === 'string' ? req.body.roomNumber.trim().toUpperCase() : '';
    const type = typeof req.body.type === 'string' ? req.body.type.trim() : '';
    const capacity = Number(req.body.capacity);

    if (!roomNumber || !type) {
      return res.status(400).json({ error: 'Room Number, Type, and Capacity are required.' });
    }
    if (!ROOM_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid room type.' });
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) {
      return res.status(400).json({ error: 'Capacity must be a whole number between 1 and 10.' });
    }

    const room = await Room.create({ roomNumber, type, capacity, occupants: [] });
    res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate blocked: A room with this Room Number already exists.' });
    }
    res.status(500).json({ error: 'Failed to add hostel room.' });
  }
});

// POST allocate a student to a room (strictly blocks allocation beyond room capacity)
app.post('/api/rooms/:id/allocate', async (req, res) => {
  try {
    const studentName = typeof req.body.studentName === 'string' ? req.body.studentName.trim() : '';
    const rollNo = typeof req.body.rollNo === 'string' ? req.body.rollNo.trim().toUpperCase() : '';

    if (!studentName || !rollNo) {
      return res.status(400).json({ error: 'Student Name and Roll No. are required.' });
    }

    const alreadyAllocated = await Room.findOne({ 'occupants.rollNo': rollNo });
    if (alreadyAllocated) {
      return res.status(409).json({
        error: `Student ${rollNo} is already allocated to Room ${alreadyAllocated.roomNumber}.`,
      });
    }

    const updated = await Room.findOneAndUpdate(
      {
        _id: req.params.id,
        $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
      },
      {
        $push: {
          occupants: {
            studentName,
            rollNo,
            allocatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await Room.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Hostel room not found.' });
      }
      return res.status(409).json({
        error: `Capacity exceeded: Room ${existing.roomNumber} is already full (${existing.occupants.length} / ${existing.capacity} occupied).`,
      });
    }

    res.status(201).json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }
    res.status(500).json({ error: 'Failed to allocate student to room.' });
  }
});

// DELETE vacate a student from a room
app.delete('/api/rooms/:id/occupants/:rollNo', async (req, res) => {
  try {
    const rollNo = String(req.params.rollNo || '').trim().toUpperCase();
    const updated = await Room.findByIdAndUpdate(
      req.params.id,
      { $pull: { occupants: { rollNo } } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Hostel room not found.' });
    }
    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }
    res.status(500).json({ error: 'Failed to remove occupant.' });
  }
});

// DELETE a vacant room
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Hostel room not found.' });
    }
    if (room.occupants.length > 0) {
      return res.status(409).json({
        error: `Cannot delete Room ${room.roomNumber} while ${room.occupants.length} student(s) occupy it.`,
      });
    }

    await Room.deleteOne({ _id: room._id });
    res.json({ message: 'Room deleted.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Room.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Hostel Allocation System running at http://localhost:${PORT}`);
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
