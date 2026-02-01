# KhataBook

Multi-user expense and ledger tracker with **Google OAuth** and **cloud storage**.  
Data persists across devices and survives browser/app uninstall.

## Features

- Login with Google (Gmail)
- Cloud storage (MySQL) – data never lost
- User-specific data – each user sees only their own KhataBook
- Account-based ledger (Cash, Bank, Udhaari, etc.)
- Pay / Receive / Transfer transactions
- Dashboard, Reports, Category charts

## Structure

### Frontend (Vanilla JS)
- `index.html` – Dashboard
- `add.html` – Add transaction
- `report.html` – Reports
- `login.html` – Google sign-in
- `js/data.js` – API client, migration, helpers
- `js/auth-guard.js` – Protects routes, redirects to login
- `js/auth-config.js` – API URL, Google Client ID
- `js/login.js` – Google OAuth flow

### Backend (Node.js + Express)
- `backend/server.js` – API server
- `backend/routes/auth.js` – Google OAuth
- `backend/routes/user.js` – User profile
- `backend/routes/transactions.js` – CRUD
- `backend/sql/schema.sql` – MySQL schema

## Quick Start

1. **Database**: Run `backend/sql/schema.sql` in MySQL
2. **Backend**: Copy `backend/.env.example` → `backend/.env`, fill values, then:
   ```bash
   cd backend && npm install && npm start
   ```
3. **Frontend**: Set `GOOGLE_CLIENT_ID` in `js/auth-config.js`
4. Serve frontend (e.g. Live Server on port 5500)
5. Open `login.html` and sign in with Google

Full setup: see **[SETUP.md](SETUP.md)**.
