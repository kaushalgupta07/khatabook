# KhataBook - Setup Instructions

This guide walks you through setting up the multi-user, cloud-backed KhataBook app with Google OAuth and MySQL.

---

## Prerequisites

- **Node.js** (v16 or later)
- **MySQL** (5.7 or 8.x)
- **Google Cloud** account (for OAuth)

---

## Step 1: MySQL Database Setup

1. Start MySQL and open a MySQL client (e.g. MySQL Workbench or `mysql` CLI).

2. Run the schema script:
   ```bash
   mysql -u root -p < backend/sql/schema.sql
   ```
   Or copy the contents of `backend/sql/schema.sql` and execute in your MySQL client.

3. Verify tables exist:
   ```sql
   USE khatabook;
   SHOW TABLES;
   -- Should show: users, transactions
   ```

---

## Step 2: Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/).

2. Create a new project (or select existing).

3. Enable **Google+ API** / **Google Identity**:
   - APIs & Services → Library → search "Google Identity" or "Google+ API"

4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: e.g. "KhataBook"
   - Authorized JavaScript origins:
     - `http://localhost:5500` (if using Live Server)
     - `http://127.0.0.1:5500`
     - Add your production URL when deploying
   - Authorized redirect URIs: leave default (not needed for ID token flow)
   - Copy the **Client ID** and **Client Secret**

---

## Step 3: Backend Configuration

1. Copy the example env file:
   ```bash
   cd backend
   copy .env.example .env
   ```

2. Edit `backend/.env` and fill in:
   ```env
   PORT=8080
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=khatabook

   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret

   JWT_SECRET=generate_a_random_32_char_string

   FRONTEND_URL=http://localhost:5500
   ```

3. Generate a JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Use the output as `JWT_SECRET`.

4. Install dependencies and start the backend:
   ```bash
   npm install
   npm start
   ```
   Backend runs at `http://localhost:8080`.

---

## Step 4: Frontend Configuration

1. Edit `js/auth-config.js` and set your Google Client ID:
   ```javascript
   const KB_AUTH_CONFIG = {
     API_BASE_URL: "http://localhost:8080/api",
     GOOGLE_CLIENT_ID: "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
   };
   ```

2. For production, update `API_BASE_URL` to your deployed backend URL.

---

## Step 5: Run the App

1. **Start the backend** (from `backend/` folder):
   ```bash
   npm start
   ```

2. **Serve the frontend** (use any static server):
   - **VS Code Live Server**: Right-click `index.html` → Open with Live Server (typically `http://localhost:5500`)
   - **Python**: `python -m http.server 5500`
   - **Node**: `npx serve . -p 5500`

3. **Important**: Open the app from the same origin as `FRONTEND_URL` in `.env` (e.g. `http://localhost:5500`). CORS is configured for that URL.

4. Open `login.html` (or you'll be redirected there if not logged in). Click **Login with Google** and sign in.

5. After login, you're redirected to the dashboard. Your data is now stored in the cloud.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Google OAuth login (body: `{ idToken }`) |
| GET | `/api/user/profile` | Get current user (requires auth) |
| GET | `/api/transactions` | Get all user transactions |
| POST | `/api/transactions` | Add transaction |
| POST | `/api/transactions/bulk` | Bulk import (migration) |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

---

## Data Migration (First Login)

When a user logs in for the first time with existing localStorage data:

1. The app detects legacy `khatabook_expenses` in localStorage.
2. Converts old format to transactions (type: pay, debitAccount: cash).
3. Uploads to backend via `POST /api/transactions/bulk`.
4. Clears localStorage expenses and sets `khatabook_migrated`.
5. Account config and categories remain in localStorage (UI preferences).

---

## Troubleshooting

- **"Could not connect to server"**: Ensure backend is running on port 8080.
- **"Invalid Google token"**: Check GOOGLE_CLIENT_ID matches in backend `.env` and `js/auth-config.js`. Ensure authorized origins include your frontend URL.
- **CORS errors**: Ensure `FRONTEND_URL` in `.env` matches the URL you use to open the app.
- **Database connection failed**: Verify MySQL is running and credentials in `.env` are correct.
