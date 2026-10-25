# Food Ilee

Food Ilee is a marketplace application for managing food waste and connecting stores with buyers. The repository contains a Node.js/Express API and a browser based frontend.

## Requirements

- Node.js 18 or later and npm
- PostgreSQL
- API credentials for any integrations you plan to use (Google OAuth, Groq, Cloudinary, and Midtrans)

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

To enable Google sign-in, create a Google OAuth web client ID in Google Cloud Console. Set the same `GOOGLE_CLIENT_ID` in `backend/.env` and `frontend/config.js` (`googleClientId`). Add your frontend origins (for example `http://localhost:5501` and your deployed domain) to the OAuth client's authorized JavaScript origins. The backend verifies the Google ID token against that client ID; no client secret is needed.

To run the API without the development file watcher, use `npm run start:backend`.

### Frontend production assets

Create the deployable frontend directory with `npm --prefix frontend run build`. The build writes
`frontend/dist`, gives bundled local images and SVGs content-based filenames, and updates their
references in the copied HTML, CSS, and JavaScript. Preview that output locally with
`npm --prefix frontend run preview`.

The Vercel frontend project serves the versioned files in `dist/assets` with long-lived browser
caching. The local development server revalidates images with ETags, while HTML and code stay
uncached. Images uploaded to an external image host follow that host's own cache policy.

## Environment variables

See [`backend/.env.example`](backend/.env.example) for the configuration template. Never commit `.env` files or real API credentials. `DATABASE_URL` and `JWT_SECRET` are needed for normal backend operation. Password reset emails require `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; use a sender address verified in Resend. Integration credentials are needed by the corresponding features.

## Notes

- Prisma schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
- API routes are mounted under `/api`.
- User uploaded or generated files are ignored by Git; production deployments should use persistent or object storage.

## Deploy to Vercel

Deploy this monorepo as **two Vercel projects** connected to the same Git repository:

1. Create the backend project first and set its **Root Directory** to `backend`. Keep the detected `backend/vercel.json` settings. The API is exported from `src/app.js`; `src/server.js` is only for local development and Socket.IO.
2. Add the backend environment variables in Vercel Project Settings → Environment Variables:
   - Required: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`.
   - Password reset email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified sender address).
   - Integrations as used: `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SPLIT_ENABLED`, `MIDTRANS_PARTNER_MERCHANT_ID`, `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_WEBHOOK_SECRET`, `BITESHIP_COD_SETTLEMENT_DAYS`.
   - Use a hosted PostgreSQL database for `DATABASE_URL`. Set `MIDTRANS_IS_PRODUCTION=false` while using Midtrans Sandbox.
3. Deploy the backend and copy its production URL, such as `https://foodilee-api.vercel.app`.
4. Create the frontend project from the same repository with **Root Directory** `frontend`. Add `FOODILEE_API_BASE_URL=https://foodilee-api.vercel.app/api`, `GOOGLE_CLIENT_ID` (the same Google OAuth web client ID), and `FOODILEE_REALTIME=false`, then deploy.
5. Set the frontend's production origin in backend `FRONTEND_URL` and `CORS_ORIGINS` (for example `https://foodilee.vercel.app`), then redeploy the backend. Add custom domains to these variables too if you use them.
6. Set payment and shipping provider webhook URLs to `https://<backend-domain>/api/payments/midtrans/webhook` and `https://<backend-domain>/api/payments/biteship/webhook`.

The frontend build fails if `FOODILEE_API_BASE_URL` is missing, to avoid publishing a site that silently sends requests to the wrong host. Google sign-in requires the same `GOOGLE_CLIENT_ID` in both Vercel projects; add the frontend's production origin to that OAuth client in Google Cloud Console. `FOODILEE_REALTIME=false` enables the chat's HTTP polling fallback because Vercel Functions cannot host the existing Socket.IO connection. Images are capped at 4 MB for requests to the serverless API.

Run database migrations against the hosted database before opening the site to users:

```bash
npm --prefix backend run db:deploy
```

Keep all credentials in Vercel environment settings; do not put secret values in `frontend` variables or commit them to the repository. If a Vercel environment variable changes, redeploy the corresponding project so its build/runtime receives the updated value.
