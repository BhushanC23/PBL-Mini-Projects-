# 14 - Complaint & Feedback Management

A standalone, college-level Full-Stack mini-project with a complaint/feedback submission form (category & priority) and an Admin Dashboard to filter by status and update tickets (`Open`, `In Progress`, `Resolved`).

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

On first startup, if the `complaints` collection in `14-complaint-management` is empty, 5 sample complaints across `Open`, `In Progress`, and `Resolved` are automatically seeded.

## Features & REST APIs

- `GET /api/meta` — Categories, priorities, and status options
- `GET /api/complaints?status=Open|In Progress|Resolved` — Filtered complaints list plus status counts
- `POST /api/complaints` — Submit a new complaint/feedback ticket (`Open`)
- `PATCH /api/complaints/:id/status` — Update complaint status (`Open`, `In Progress`, `Resolved`)
- `DELETE /api/complaints/:id` — Remove a complaint
