# 03 - Library Management System

A standalone, college-level Full-Stack mini-project for librarians to manage books, issue copies to members, strictly prevent double-issuing, and process returns.

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

On first startup, if the `books` collection in `03-library-management` is empty, 5 sample books (3 Available, 2 Issued) are automatically seeded.

## Features & REST APIs

- `GET /api/books` — List books (supports `?status=Available|Issued` and `?q=` search)
- `POST /api/books` — Add a new book (blocks duplicate ISBN with HTTP `409`)
- `POST /api/books/:id/issue` — Atomic issue operation; strictly rejects already-issued books with HTTP `409`
- `POST /api/books/:id/return` — Marks an issued book as `Available`
- `DELETE /api/books/:id` — Deletes an available book (blocks deleting currently issued books)
