# Test & Development Guide

This guide covers local development setup and how to run the automated testing suite.

## 💻 Local Development

### 1. Setup Environment
Ensure you have Node.js 20+ and Docker installed.

```bash
cd app
npm install
```

### 2. Start Infrastructure
Run only the database and n8n locally to support the app:
```bash
docker compose up postgres n8n -d
```

### 3. Database Migrations
Initialize your local database schema:
```bash
npm run migrate
```

### 4. Seed Admin User
Create a default admin user for the dashboard:
```bash
npm run seed
```

### 5. Run the App
```bash
npm run dev
```

---

## 🧪 Testing Suite

We use **Vitest** for our testing framework.

### Run All Tests
```bash
npm test
```

### Key Test Areas
- **Status Transitions**: Verified in `tests/transitions.test.ts`. Ensures respondents can only move through valid state sequences.
- **API Readiness**: Verified in `tests/readiness.test.ts`. Checks health and core endpoint responses.

### CI Integration
Our GitHub Actions pipeline (`.github/workflows/ci.yml`) runs linting, tests, and migration verification on every pull request.

---

## 📏 Engineering Standards

- **Transactions**: Always wrap multi-statement DB updates in a transaction.
- **Idempotency**: Use `dedupe_key` in the `events` table to prevent duplicate webhook processing.
- **Logging**: Use the structured logger in `lib/log.ts` for all API routes.
- **Types**: All API responses and database rows must be strictly typed in `types/`.
