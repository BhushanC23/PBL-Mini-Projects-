const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/06-online-quiz';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const questionSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, unique: true },
    topic: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: 'Each MCQ must have exactly 4 options.',
      },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { timestamps: true }
);

const resultSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    timeTakenSeconds: { type: Number, default: 0, min: 0 },
    timedOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Question = mongoose.model('Question', questionSchema);
const Result = mongoose.model('Result', resultSchema, 'results');

const SEED_QUESTIONS = [
  {
    order: 1,
    topic: 'Web Basics',
    question: 'Which HTTP status code indicates that a new resource was successfully created?',
    options: ['200 OK', '201 Created', '204 No Content', '409 Conflict'],
    correctIndex: 1,
  },
  {
    order: 2,
    topic: 'JavaScript',
    question: 'Which method converts a JavaScript object into a JSON string?',
    options: ['JSON.parse()', 'JSON.stringify()', 'Object.toJSON()', 'String.fromJSON()'],
    correctIndex: 1,
  },
  {
    order: 3,
    topic: 'Express.js',
    question: 'Which middleware parses incoming JSON request bodies in Express 4+?',
    options: ['express.static()', 'express.urlencoded()', 'express.json()', 'express.router()'],
    correctIndex: 2,
  },
  {
    order: 4,
    topic: 'MongoDB',
    question: 'What is the default port on which MongoDB listens locally?',
    options: ['3306', '5432', '6379', '27017'],
    correctIndex: 3,
  },
  {
    order: 5,
    topic: 'Mongoose',
    question: 'Which Mongoose method returns the total number of documents matching a filter?',
    options: ['countDocuments()', 'totalDocs()', 'lengthDocuments()', 'sumDocs()'],
    correctIndex: 0,
  },
  {
    order: 6,
    topic: 'HTTP',
    question: 'Which HTTP method is conventionally used to partially update an existing resource?',
    options: ['GET', 'POST', 'PATCH', 'HEAD'],
    correctIndex: 2,
  },
  {
    order: 7,
    topic: 'JavaScript',
    question: 'What does `await` do inside an `async` function?',
    options: [
      'Stops the entire Node.js server',
      'Pauses the async function until the Promise settles',
      'Converts callbacks into event emitters',
      'Runs code in a separate OS thread',
    ],
    correctIndex: 1,
  },
  {
    order: 8,
    topic: 'Databases',
    question: 'Which MongoDB error code is returned when a unique index constraint is violated?',
    options: ['404', '11000', '500', '1045'],
    correctIndex: 1,
  },
  {
    order: 9,
    topic: 'HTML/DOM',
    question: 'Which Browser API is used in modern Vanilla JS to make asynchronous HTTP requests?',
    options: ['fetch()', 'request()', 'http.get()', 'axios.pull()'],
    correctIndex: 0,
  },
  {
    order: 10,
    topic: 'REST API',
    question: 'Which HTTP status code is best suited for rejecting a duplicate or conflicting booking?',
    options: ['200 OK', '301 Moved Permanently', '409 Conflict', '503 Service Unavailable'],
    correctIndex: 2,
  },
];

const SEED_RESULTS = [
  {
    studentName: 'Aarav Sharma',
    score: 9,
    totalQuestions: 10,
    percentage: 90,
    timeTakenSeconds: 64,
    timedOut: false,
  },
  {
    studentName: 'Priya Nair',
    score: 7,
    totalQuestions: 10,
    percentage: 70,
    timeTakenSeconds: 88,
    timedOut: false,
  },
];

async function seedIfEmpty() {
  const qCount = await Question.countDocuments();
  if (qCount === 0) {
    await Question.insertMany(SEED_QUESTIONS);
    console.log('Seeded 10 MCQs into questions collection.');
  }

  const rCount = await Result.countDocuments();
  if (rCount === 0) {
    await Result.insertMany(SEED_RESULTS);
    console.log('Seeded 2 sample attempts into results collection.');
  }
}

// GET all 10 MCQs (excluding correctIndex so answers stay server-side)
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find()
      .select('-correctIndex -__v')
      .sort({ order: 1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load quiz questions.' });
  }
});

// GET past quiz attempts
app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 }).limit(20);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load past attempts.' });
  }
});

// POST submit quiz answers, calculate score server-side, and save in results collection
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const studentName = typeof req.body.studentName === 'string' ? req.body.studentName.trim() : '';
    const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const timeTakenSeconds = Math.max(0, Math.round(Number(req.body.timeTakenSeconds) || 0));
    const timedOut = Boolean(req.body.timedOut);

    if (!studentName) {
      return res.status(400).json({ error: 'Student name is required to submit the quiz.' });
    }

    const questions = await Question.find().sort({ order: 1 });
    if (questions.length === 0) {
      return res.status(500).json({ error: 'No quiz questions found in database.' });
    }

    let score = 0;
    const breakdown = questions.map((q) => {
      const rawSelection = answers[String(q._id)];
      const selectedIndex =
        rawSelection === null || rawSelection === undefined || rawSelection === ''
          ? null
          : Number(rawSelection);
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) score += 1;

      return {
        questionId: q._id,
        order: q.order,
        question: q.question,
        options: q.options,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const savedResult = await Result.create({
      studentName,
      score,
      totalQuestions,
      percentage,
      timeTakenSeconds,
      timedOut,
    });

    res.status(201).json({
      result: savedResult,
      breakdown,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade and save quiz attempt.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB: ${MONGO_URI}`);
    await Question.init();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`Online Quiz App running at http://localhost:${PORT}`);
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
