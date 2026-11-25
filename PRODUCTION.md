# Binod Enterprises Shop

## Production deployment

The application includes a self-hosted Node.js API, role-based JWT authentication, server-side validation, stock transactions, PWA offline storage, and an Electron Windows client.

### Requirements

- Node.js 20 or newer
- A persistent writable disk for `data/shop.json`
- HTTPS in production
- A backup process for `data/shop.json`

### Configure

```bash
cp .env.example .env
```

Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set `JWT_SECRET` in `.env` and never commit it.

### Start web/API server

```bash
npm install
npm run build
npm start
```

The server listens on port `8787` by default and serves the React app plus `/api` routes.

### Windows installer

```bash
npm install
npm run desktop:win
```

Installers are created in `release/`.

### Default accounts

Initial demo accounts are created only once:

| Role | Username | Password |
|---|---|---|
| Owner | owner | owner123 |
| Admin | admin | admin123 |
| User | user | user123 |

Change these passwords or delete demo accounts before production use. The initial owner is protected from deletion.

### Security notes

- Run behind HTTPS and a reverse proxy.
- Restrict outbound and filesystem access appropriately.
- Back up `data/shop.json` regularly.
- This JSON-file database is suitable for a single-server deployment. Use PostgreSQL/MySQL for high availability or multiple server instances.
