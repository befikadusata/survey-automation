# Deployment Guide

This guide details how to deploy the Survey Automation platform to a production environment using Docker and Caddy.

## 📋 Prerequisites

- **Server**: A Linux VPS (Ubuntu 22.04+ recommended) with at least 2GB RAM.
- **Docker**: Docker Engine and Docker Compose installed.
- **Domain**: A registered domain (e.g., `surveys.yourdomain.com`) pointing to your server's IP.
- **Email Provider**: A Brevo (formerly Sendinblue) account for email delivery.

---

## 🛠️ Step 1: Environment Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-org/survey-automation.git
    cd survey-automation
    ```

2.  **Configure Environment Variables**:
    ```bash
    cp .env.example .env
    nano .env
    ```
    Ensure you set:
    - `DOMAIN`: Your production domain.
    - `POSTGRES_PASSWORD`: A strong random password.
    - `BREVO_API_KEY`: Your Brevo API key.
    - `NEXTAUTH_SECRET`: Generate one with `openssl rand -base64 32`.

---

## 🚀 Step 2: Deployment

Run the automated deployment script:
```bash
./deploy.sh
```

This script will:
1.  Check for prerequisites.
2.  Build the Next.js application container.
3.  Start PostgreSQL, n8n, and Caddy.
4.  Caddy will automatically provision SSL certificates via Let's Encrypt.

---

## ⚙️ Step 3: n8n Configuration

1.  Login to n8n at `https://yourdomain.com/n8n/` using the credentials set in `.env`.
2.  Set up your **Postgres** credential (use host `postgres`, port `5432`).
3.  Set up **Brevo API** and **OAuth2** (Google/Microsoft) credentials.
4.  Import workflows as described in the [Workflow Tutorials](WORKFLOW_TUTORIALS.md).

---

## 💾 Backup and Recovery

### Database Backup
Back up the PostgreSQL data volume regularly:
```bash
docker exec -t survey-automation-postgres-1 pg_dumpall -c -U survey > backup.sql
```

### Recovery
To restore a backup:
```bash
cat backup.sql | docker exec -i survey-automation-postgres-1 psql -U survey
```

---

## 🔍 Troubleshooting

- **Logs**: View real-time logs with `docker compose logs -f`.
- **SSL Issues**: Check Caddy logs: `docker compose logs caddy`.
- **Database**: Connect to the DB manually: `docker compose exec postgres psql -U survey surveydb`.
