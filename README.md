# Binod Enterprises Shop

A responsive React shop-management application with an Electron wrapper for Windows desktop use.

## Features

- Owner, admin, and user roles
- Product, stock, sales, billing, purchase, and account management
- Role-based permissions
- Offline local storage and PWA service worker
- Excel export for filtered sales
- Automatic stock updates for purchases, sales, and billing
- Responsive web interface and Windows desktop shell

## Run locally

```bash
npm install
npm run dev
```

## Build web app

```bash
npm run build
npm run preview
```

## Run Windows desktop app

```bash
npm install
npm run desktop
```

To create an installer on Windows:

```bash
npx electron-builder --win
```

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Owner | owner | owner123 |
| Admin | admin | admin123 |
| User | user | user123 |

Data is stored locally in the browser/Electron local storage. For production multi-device synchronization, connect the app to a secured backend API and set up authenticated synchronization for the stored entities.
