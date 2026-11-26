# 09 - Private Notes & Blogs (JWT Auth)

A standalone, college-level Full-Stack mini-project implementing user signup and login with `bcryptjs` password hashing and `jsonwebtoken` (JWT), ensuring each user can only view, create, edit, and delete their own notes.

## Tech Stack

- **Backend:** Node.js, Express.js, Mongoose (MongoDB), `bcryptjs`, `jsonwebtoken`
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

On first startup, if empty, `server.js` seeds 2 demo users (`aarav@college.edu` and `priya@college.edu`, password: `pass123`) with 2 private notes each so you can test user isolation immediately.

## Features & REST APIs

- `POST /api/auth/signup` — Register a new user with `bcryptjs`-hashed password and return a JWT
- `POST /api/auth/login` — Verify credentials and return a JWT
- `GET /api/auth/me` — Verify current JWT session
- `GET /api/notes` — Returns only the logged-in user's notes (requires `Authorization: Bearer <token>`)
- `POST /api/notes` — Create a note owned by the logged-in user
- `PUT /api/notes/:id` & `DELETE /api/notes/:id` — Strictly enforces note ownership (`403` if owned by another user)
