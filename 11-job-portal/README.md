# 11 - Campus Job & Internship Portal

A standalone, college-level Full-Stack mini-project with a **Student View** (browse, search by title/location, and apply) and a **Recruiter View** (post jobs and review student applications stored in MongoDB).

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

On first startup, if empty, `server.js` seeds 5 sample campus jobs and 2 sample student applications into `11-job-portal`.

## Features & REST APIs

- `GET /api/jobs?q=` — List jobs filtered by title, location, or company with applicant counts
- `POST /api/jobs` — Recruiter posts a new job
- `DELETE /api/jobs/:id` — Recruiter removes a job
- `GET /api/applications` — Recruiter lists all student applications with job details
- `POST /api/jobs/:id/apply` — Student submits application; blocks duplicate application per job+email (`409`)
