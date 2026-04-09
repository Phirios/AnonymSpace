<p align="center">
  <img src="frontend/public/icons/icon-192.png" alt="AnonymSpace" width="96" />
</p>

# AnonymSpace

Anonymous group chat spaces where messages disappear.

## Features

- Create public or private chat spaces
- Join spaces via 6-character codes
- Anonymous or named messaging
- Auto-delete spaces after inactivity or set duration
- User accounts with profiles
- Space history for finished conversations
- PWA support for mobile

## Tech Stack

**Backend:** Rust, Axum, PostgreSQL, SQLx

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS

## Setup

### Prerequisites

- Rust
- Node.js / Bun
- PostgreSQL

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
cargo run
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if needed
bun install
bun dev
```

### Database

Create a PostgreSQL database and run migrations:

```bash
psql -U postgres -c "CREATE DATABASE anonymspace;"
```

Migrations run automatically on backend startup.

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## License

MIT
