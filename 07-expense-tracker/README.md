# 07 - Income & Expense Tracker

A standalone, college-level Full-Stack mini-project to add, edit, and delete income and expense entries by category and date, with monthly summary cards and a category filter.

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

On first startup, if the `transactions` collection in `07-expense-tracker` is empty, 5 sample income and expense entries for the current month are automatically seeded.

## Features & REST APIs

- `GET /api/meta` — Available categories and current month
- `GET /api/transactions?month=YYYY-MM&category=...` — Filtered entries plus monthly `totalIncome`, `totalExpense`, and `netBalance`
- `POST /api/transactions` — Add income or expense entry with validation
- `PUT /api/transactions/:id` — Edit an existing entry
- `DELETE /api/transactions/:id` — Delete an entry
