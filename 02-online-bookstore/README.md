# 02 - Online Bookstore

A standalone, college-level Full-Stack mini-project featuring a book catalogue with category filters, a persistent MongoDB-backed shopping cart, stock validation, and order checkout.

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

On first startup, if the `books` collection in `02-online-bookstore` is empty, 6 sample books across 3 categories (`Programming`, `Fiction`, `Science`) are automatically seeded.

## Features & REST APIs

- `GET /api/books` (supports `?category=` filtering)
- `GET /api/cart`, `POST /api/cart`, `PATCH /api/cart/:bookId`, `DELETE /api/cart/:bookId`
- `GET /api/orders`, `POST /api/orders` (validates customer details & stock, deducts stock, stores order, clears cart)
