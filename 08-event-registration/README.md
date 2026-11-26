# 08 - Event Registration Portal

A standalone, college-level Full-Stack mini-project with client-side email & 10-digit mobile validation, server-side duplicate email blocking, and an Admin registrants tab.

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

On first startup, if the `registrations` collection in `08-event-registration` is empty, 5 sample registrants are automatically seeded.

## Features & REST APIs

- `GET /api/events` — Available campus events
- `GET /api/registrations` — List all registrants for Admin view (optional `?event=` and `?q=` filters)
- `POST /api/registrations` — Validates name, email, 10-digit mobile, and blocks duplicate emails with HTTP `409`
- `DELETE /api/registrations/:id` — Remove a registration
