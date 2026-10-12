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
