# 15 - Campus Placement Portal

A standalone, college-level Full-Stack mini-project with student profile registration, active company drive listings with CGPA eligibility checks, and an Admin view to inspect applicants per drive and mark them `Selected` or `Not Selected`.

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

On first startup, if empty, `server.js` automatically seeds 3 student profiles, 4 company drives (3 Active, 1 Closed), and 3 sample applications in `15-placement-portal`.

## Features & REST APIs

- `GET /api/students`, `POST /api/students` — List and register student profiles (blocks duplicate Roll No. and Email)
- `GET /api/drives`, `POST /api/drives`, `PATCH /api/drives/:id/status` — List, create, and open/close company placement drives
- `POST /api/drives/:id/apply` — Student applies to an active drive (validates `Active` status, `minCgpa`, and blocks duplicates)
- `GET /api/applications`, `PATCH /api/applications/:id/status` — View applicants per drive and mark `Selected` or `Not Selected`
