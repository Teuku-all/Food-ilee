# Food Ilee

Food Ilee is a marketplace application for managing food waste and connecting stores with buyers. The repository contains a Node.js/Express API and a browser based frontend.

## Requirements

- Node.js 18 or later and npm
- PostgreSQL
- API credentials for any integrations you plan to use (Groq, Cloudinary, and Midtrans)

## Project structure

```text
.
├── backend/
│   ├── prisma/              # Prisma schema and database migrations
│   └── src/
│       ├── config/          # Database and third party integrations
│       ├── controllers/     # HTTP request handlers
│       ├── middlewares/     # Authentication, uploads, and error handling
│       ├── routes/          # API route definitions
│       ├── services/        # Business logic and data access
│       └── validations/     # Request validation schemas
├── frontend/
│   ├── pages/               # Page renderers
│   ├── services/            # API clients
│   ├── styles/              # Application stylesheets
│   └── utils/               # Shared browser utilities
└── ui-refference/           # UI reference material
```

## Setup

Install backend dependencies and prepare the database client:

```bash
npm --prefix backend install
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL connection string and a private JWT secret. Add integration credentials for the services you use. Then apply migrations and generate the Prisma client:

```bash
npm --prefix backend run db:deploy
npm --prefix backend run db:generate
```

For local development, open two terminals from the repository root:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

The API listens on `http://localhost:5000` and the frontend on `http://localhost:5501`. The frontend is served as static files; it does not require a separate build step.

To run the API without the development file watcher, use `npm run start:backend`.

## Environment variables

See [`backend/.env.example`](backend/.env.example) for the configuration template. Never commit `.env` files or real API credentials. `DATABASE_URL` and `JWT_SECRET` are needed for normal backend operation. Integration credentials are needed by the corresponding features.

## Notes

- Prisma schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
- API routes are mounted under `/api`.
- User uploaded or generated files are ignored by Git; production deployments should use persistent or object storage.

## Deploy to Vercel

Deploy this monorepo as **two Vercel projects** connected to the same Git repository:

1. Create the backend project first and set its **Root Directory** to `backend`. Keep the detected `backend/vercel.json` settings. The API is exported from `src/app.js`; `src/server.js` is only for local development and Socket.IO.
2. Add the backend environment variables in Vercel Project Settings → Environment Variables:
   - Required: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`.
   - Integrations as used: `GROQ_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SPLIT_ENABLED`, `MIDTRANS_PARTNER_MERCHANT_ID`, `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_WEBHOOK_SECRET`, `BITESHIP_COD_SETTLEMENT_DAYS`.
   - Use a hosted PostgreSQL database for `DATABASE_URL`. Set `MIDTRANS_IS_PRODUCTION=false` while using Midtrans Sandbox.
3. Deploy the backend and copy its production URL, such as `https://foodilee-api.vercel.app`.
4. Create the frontend project from the same repository with **Root Directory** `frontend`. Add `FOODILEE_API_BASE_URL=https://foodilee-api.vercel.app/api` (replace with the backend URL) and `FOODILEE_REALTIME=false`, then deploy.
5. Set the frontend's production origin in backend `FRONTEND_URL` and `CORS_ORIGINS` (for example `https://foodilee.vercel.app`), then redeploy the backend. Add custom domains to these variables too if you use them.
6. Set payment and shipping provider webhook URLs to `https://<backend-domain>/api/payments/midtrans/webhook` and `https://<backend-domain>/api/payments/biteship/webhook`.

The frontend build fails if `FOODILEE_API_BASE_URL` is missing, to avoid publishing a site that silently sends requests to the wrong host. `FOODILEE_REALTIME=false` enables the chat's HTTP polling fallback because Vercel Functions cannot host the existing Socket.IO connection. Images are capped at 4 MB for requests to the serverless API.

Run database migrations against the hosted database before opening the site to users:

```bash
npm --prefix backend run db:deploy
```

Keep all credentials in Vercel environment settings; do not put secret values in `frontend` variables or commit them to the repository. If a Vercel environment variable changes, redeploy the corresponding project so its build/runtime receives the updated value.
