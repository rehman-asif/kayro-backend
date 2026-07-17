# Kayro Backend

Production-grade authentication system + HubSpot CRM integration built with **Node.js**, **Express**, **MongoDB (Mongoose)**, and the **HubSpot API Client**.

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB Atlas connection
│   │   └── hubspot.js         # HubSpot SDK client initializer
│   ├── models/
│   │   ├── User.js            # User schema (customers)
│   │   └── Admin.js           # Admin schema (admins/superadmins)
│   ├── controllers/
│   │   ├── authController.js       # User register/login/logout/me/refresh
│   │   ├── adminAuthController.js  # Admin login/logout/me/refresh
│   │   └── hubspotController.js    # HubSpot contact lookup (admin only)
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth/*
│   │   ├── adminRoutes.js     # /api/admin/auth/*
│   │   └── hubspotRoutes.js   # /api/hubspot/*
│   ├── middleware/
│   │   ├── auth.js            # Verify user JWT
│   │   ├── adminAuth.js       # Verify admin JWT
│   │   └── errorHandler.js    # Centralized error handler
│   ├── services/
│   │   └── hubspotService.js  # createOrUpdateContact, getContactByEmail
│   ├── utils/
│   │   ├── generateToken.js   # Sign user/admin JWT access+refresh tokens
│   │   └── hashPassword.js    # bcrypt hash & compare helpers
│   └── app.js                 # Express app setup (CORS, helmet, routes)
├── scripts/
│   └── createAdmin.js         # CLI seed script for first admin
├── server.js                  # Entry point
├── .env                       # Local env (never commit!)
├── .env.example               # Environment variable template
├── requests.http              # REST Client test file (VS Code)
└── package.json
```

---

## Prerequisites

- **Node.js** v18+
- **npm** v9+
- A **MongoDB Atlas** account with a cluster (or local MongoDB)
- A **HubSpot Private App** with `crm.objects.contacts.read` + `crm.objects.contacts.write` scopes

---

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/kayro_db
JWT_USER_SECRET=super_long_random_user_secret
JWT_ADMIN_SECRET=super_long_random_admin_secret
JWT_USER_REFRESH_SECRET=super_long_random_user_refresh_secret
JWT_ADMIN_REFRESH_SECRET=super_long_random_admin_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
FRONTEND_URL=http://localhost:5173
```

> **Security:** Use long, random strings for JWT secrets. You can generate them with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Run Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:5000`

---

## Seeding the First Admin

Admins **cannot** be created via the public API. Use the CLI seed script:

```bash
node scripts/createAdmin.js --name="Admin One" --email="admin@example.com" --password="SecurePassword123"
```

Or via the npm script shorthand:

```bash
npm run seed-admin -- --name="Admin One" --email="admin@example.com" --password="SecurePassword123"
```

The script will:
- Connect to MongoDB using your `MONGO_URI`
- Check if an admin with that email already exists (safe to re-run)
- Hash the password with bcrypt (salt rounds = 10)
- Save the admin to the `admins` collection

---

## API Endpoints

### User Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login, receive tokens in cookies |
| POST | `/api/auth/logout` | Public | Clear user cookies |
| GET | `/api/auth/me` | User Token | Get current user profile |
| POST | `/api/auth/refresh-token` | Refresh Cookie | Get new access token |

### Admin Auth — `/api/admin/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/auth/login` | Public | Admin login (Admin collection only) |
| POST | `/api/admin/auth/logout` | Admin Token | Clear admin cookies |
| GET | `/api/admin/auth/me` | Admin Token | Get current admin profile |
| POST | `/api/admin/auth/refresh-token` | Admin Refresh Cookie | Get new admin access token |

### HubSpot — `/api/hubspot`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hubspot/contact?email=...` | Admin Token | Look up a HubSpot contact by email |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status |

---

## Authentication Architecture

### Token Strategy
- **User tokens** are signed with `JWT_USER_SECRET`
- **Admin tokens** are signed with `JWT_ADMIN_SECRET`
- These secrets are **completely separate** — a user token cannot be used on admin routes and vice versa
- Access tokens expire in **15 minutes** (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens expire in **7 days** (configurable via `JWT_REFRESH_EXPIRES_IN`)

### Cookie Strategy
| Cookie Name | Scope | Duration |
|---|---|---|
| `user_token` | httpOnly, sameSite | 15 min |
| `user_refresh_token` | httpOnly, sameSite | 7 days |
| `admin_token` | httpOnly, sameSite | 15 min |
| `admin_refresh_token` | httpOnly, sameSite | 7 days |

All cookies are set with `httpOnly: true` (XSS-safe) and `secure: true` in production.

> **Frontend note:** Set `credentials: 'include'` in all `fetch` calls (or `withCredentials: true` in Axios) so browsers send cookies cross-origin.

---

## HubSpot Integration

On every **successful user registration**, a HubSpot contact is automatically created or updated with:
- `firstname`, `lastname` (split from `name`)
- `email`
- `lifecyclestage: lead`
- `hs_lead_status: NEW`

> HubSpot sync is **fire-and-forget** — any failure is logged but will **never** block or fail the registration response.

Required HubSpot Private App scopes:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`

---

## Security Features

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt, salt rounds = 10 |
| SQL/NoSQL injection | Mongoose schema validation |
| XSS protection | httpOnly cookies + Helmet headers |
| Brute force protection | express-rate-limit (10 req/15min for users, 5 req/15min for admins) |
| Cross-origin control | CORS restricted to `FRONTEND_URL` only |
| Token separation | Separate JWT secrets for user vs admin |
| Token type guards | `tokenType` claim prevents refresh tokens being used as access tokens |

---

## CORS Configuration

The backend only allows requests from the `FRONTEND_URL` specified in `.env`. Update this value before deploying:

```env
# Development (Vite default)
FRONTEND_URL=http://localhost:5173

# Production
FRONTEND_URL=https://yourdomain.com
```

All auth routes support `credentials: true` so cookies work correctly cross-origin.

---

## Testing

Open `requests.http` in VS Code with the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) to run all endpoint tests.

Alternatively, import the requests into Postman by converting the `.http` format manually.
