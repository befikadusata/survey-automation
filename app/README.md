# Survey Automation — Deployment & Operations

## Local Setup

1. **Prerequisites**:
   - Docker & Docker Compose
   - Node.js 20+ (for local development)

2. **Configuration**:
   - Copy `.env.example` to `.env`.
   - Fill in all required secrets (Brevo API key, Webhook secret, etc.).

3. **Launch**:
   ```bash
   docker compose up -d
   ```

4. **Initialize Admin**:
   ```bash
   docker compose exec app npm run seed-admin
   ```

## Operations

### Backups
Automated backups are not included by default. Manually backup the Postgres volume:
```bash
docker compose exec postgres pg_dump -U survey surveydb > backup_$(date +%F).sql
```

### Monitoring
- **Health Checks**: Visit `https://yourdomain.com/api/health`.
- **Logs**:
  ```bash
  docker compose logs -f app
  docker compose logs -f n8n
  ```

## Troubleshooting
- **Emails not sending**: Check n8n logs and verify Brevo API key and Template IDs.
- **Webhooks failing**: Ensure `WEBHOOK_SECRET` matches between `.env` and Brevo/Qualtrics configuration.
- **Database issues**: Check `docker compose logs postgres`.
