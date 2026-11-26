# 04 - Employee Leave Management

A standalone, college-level Full-Stack mini-project for employees to apply for leave (with start/end date validation) and admins to approve or reject requests with persistent status in MongoDB.

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

On first startup, if the `leaverequests` collection in `04-employee-leave` is empty, 5 sample leave requests (`Pending`, `Approved`, `Rejected`) are automatically seeded.

## Features & REST APIs

- `GET /api/leaves` — List all leave requests (optional `?status=Pending|Approved|Rejected`)
- `POST /api/leaves` — Submit a leave application; rejects invalid dates or `endDate < startDate` with HTTP `400`
- `PATCH /api/leaves/:id/status` — Admin decision (`Approved` or `Rejected`) persisted in MongoDB
- `DELETE /api/leaves/:id` — Remove a leave request
