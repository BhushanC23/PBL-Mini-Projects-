# 05 - Hospital Appointment Booking

A standalone, college-level Full-Stack mini-project for booking doctor appointments with strict double-booking prevention and an upcoming appointments schedule.

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

On first startup, if the `appointments` collection in `05-hospital-appointment` is empty, 5 upcoming sample appointments are automatically seeded.

## Features & REST APIs

- `GET /api/meta` — Available doctors and time slots
- `GET /api/appointments` — Upcoming appointments sorted by date and time slot (optional `?doctor=`)
- `POST /api/appointments` — Books an appointment; strictly rejects double booking of the same doctor, date, and time slot with HTTP `409` (enforced by both API check and MongoDB compound unique index)
- `DELETE /api/appointments/:id` — Cancels an appointment
