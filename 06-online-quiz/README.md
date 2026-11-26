# 06 - Online MCQ Quiz

A standalone, college-level Full-Stack mini-project with 10 auto-seeded MCQs, one-question-at-a-time navigation, a live countdown timer, server-side grading, and persistent past attempts in MongoDB.

## Tech Stack

- **Backend:** Node.js, Express.js, Mongoose (MongoDB)
- **Frontend:** Single-page HTML (`public/index.html`) with Tailwind CSS (CDN) & Vanilla JavaScript (`fetch`)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- Local MongoDB running on `mongodb://127.0.0.1:27017`

## Run Steps

```bash
npm install
npm start
```

Open `http://localhost:5000` in your browser.

On first startup, if empty, `server.js` automatically seeds **10 MCQs** into `questions` and **2 sample attempts** into `results` in `06-online-quiz`.

## Features & REST APIs

- `GET /api/questions` — Fetches all 10 MCQs (omitting `correctIndex`)
- `POST /api/quiz/submit` — Grades answers on the server, saves the attempt to `results`, and returns the score & per-question breakdown
- `GET /api/results` — Lists past quiz attempts sorted newest first
