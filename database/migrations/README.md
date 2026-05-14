# Database Migrations

This project uses a simple versioned SQL migration strategy.

## How to Apply
New migrations should be added as `NNN_description.sql` in this directory.
Apply them manually or via a CI script:
```bash
for f in database/migrations/*.sql; do
  psql -h localhost -U survey -d surveydb -f $f
done
```
