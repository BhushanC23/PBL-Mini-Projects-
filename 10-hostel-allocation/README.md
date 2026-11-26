# 10 - Hostel Room Allocation

A standalone, college-level Full-Stack mini-project to add hostel rooms, allocate students with strict capacity enforcement, and monitor vacant vs occupied rooms.

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

On first startup, if the `rooms` collection in `10-hostel-allocation` is empty, 5 sample rooms (Vacant, Occupied, and Full) are automatically seeded.

## Features & REST APIs

- `GET /api/rooms?filter=all|vacant|occupied|full` — Lists rooms with occupancy counts, status (`Vacant`, `Occupied`, `Full`), and summary stats
- `POST /api/rooms` — Add a room (blocks duplicate room numbers with HTTP `409`)
- `POST /api/rooms/:id/allocate` — Atomically allocates a student; strictly blocks allocation beyond capacity (`409`) and duplicate student roll numbers (`409`)
- `DELETE /api/rooms/:id/occupants/:rollNo` — Vacates a student from a room
- `DELETE /api/rooms/:id` — Deletes a vacant room
