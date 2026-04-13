# Tenderbite Service

Production-ready Node.js REST API backed by **Microsoft SQL Server**, with JWT-based authentication and role-based access control. Built to be extended with additional domain services (tenders, bids, notifications, etc.).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | MSSQL (via `mssql` / TDS driver) |
| Auth | JWT access + refresh token rotation |
| Password hashing | bcryptjs (configurable rounds) |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Logging | winston + morgan |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# → Edit .env with your MSSQL credentials and secret keys

# 3. Start development server (auto-restart)
npm run dev

# 4. Or start production server
npm start
```

The service will:
1. Connect to MSSQL using the pool.
2. Run idempotent migrations (`Users`, `RefreshTokens` tables).
3. Listen on `PORT` (default `3000`).

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DB_HOST` | MSSQL server hostname |
| `DB_NAME` | Database name |
| `DB_USER` / `DB_PASSWORD` | SQL credentials |
| `JWT_ACCESS_SECRET` | ≥ 64-char random string |
| `JWT_REFRESH_SECRET` | ≥ 64-char random string (different) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `BCRYPT_SALT_ROUNDS` | Recommended: `12` |

---

## API Reference

Base path: `/api/v1`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Obtain token pair |
| `POST` | `/auth/refresh` | — | Rotate refresh token |
| `POST` | `/auth/logout` | — | Revoke refresh token |
| `POST` | `/auth/logout-all` | Bearer | Revoke all tokens |
| `GET` | `/auth/me` | Bearer | Current user profile |

#### Register
```json
POST /api/v1/auth/register
{
  "email": "alice@example.com",
  "password": "Secure@123",
  "firstName": "Alice",
  "lastName": "Smith"
}
```

#### Login
```json
POST /api/v1/auth/login
{
  "email": "alice@example.com",
  "password": "Secure@123"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": { "id": "...", "email": "...", "role": "user", ... }
  }
}
```

#### Authenticated requests
```
Authorization: Bearer <accessToken>
```

---

## Project Structure

```
src/
├── config/
│   └── database.js        # MSSQL pool singleton
├── controllers/
│   └── auth.controller.js # HTTP layer
├── middleware/
│   ├── auth.middleware.js  # JWT guard + RBAC
│   ├── error.middleware.js # Central error handler
│   └── validate.middleware.js
├── models/
│   └── user.model.js      # DB queries + migrations
├── routes/
│   ├── auth.routes.js
│   └── index.js
├── services/
│   └── auth.service.js    # Business logic
├── utils/
│   ├── logger.js
│   ├── response.js        # Standard envelope
│   └── tokens.js          # JWT + bcrypt helpers
├── validators/
│   └── auth.validator.js
├── app.js                 # Express setup
└── server.js              # Bootstrap + graceful shutdown
```

---

## Security Highlights

- **Helmet** sets secure HTTP headers.
- **CORS** whitelist via `ALLOWED_ORIGINS`.
- **Rate limiting**: global (100 req/15 min) + auth endpoints (10 req/15 min).
- **Refresh token rotation**: each use issues a new pair; old token is immediately revoked.
- **Token hashing**: only SHA-256 hashes stored in DB — never raw bearer values.
- **Constant-time password comparison**: guards against user-enumeration via timing.
- **Body size limit**: `10kb` to block payload-overflow attacks.
- **Graceful shutdown**: drains connections on `SIGTERM`/`SIGINT`.

---

## Adding New Services

1. Create `src/models/<entity>.model.js` — DB queries + migration.
2. Create `src/services/<entity>.service.js` — business logic.
3. Create `src/controllers/<entity>.controller.js` — HTTP handlers.
4. Create `src/routes/<entity>.routes.js` — Express router.
5. Register in `src/routes/index.js`.
6. Call `init<Entity>Table()` inside `server.js → bootstrap()`.

---

## API Documentation (Swagger UI)

Swagger UI is **automatically enabled in development** and disabled in production.

| URL | Description |
|---|---|
| `http://localhost:3000/api-docs` | Interactive Swagger UI |
| `http://localhost:3000/api-docs.json` | Raw OpenAPI 3.0 JSON spec |

To enable in production, set `SWAGGER_ENABLED=true` in your environment.

### Authenticating in Swagger UI
1. Call **POST /auth/login** → copy the `accessToken` from the response.
2. Click **Authorize 🔒** at the top right.
3. Enter `Bearer <accessToken>` and click **Authorize**.
4. All protected endpoints will now include the token automatically.

### Adding Docs for New Routes
Swagger picks up `@openapi` JSDoc comments from all files matching `src/routes/*.js`.
Add a block like this above each route handler:

```js
/**
 * @openapi
 * /tenders:
 *   get:
 *     tags: [Tenders]
 *     summary: List all tenders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', authenticate, tenderController.list);
```

Register new schemas in `src/config/swagger.js` under `components.schemas`.
