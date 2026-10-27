# Operations Runbook — EventCraft AI

## 1. System Architecture Summary

EventCraft AI is a Next.js App Router application backed by a PostgreSQL database managed via Prisma ORM. Authentication is stateless using signed HS256 JWT session cookies. The GenAI planning and revision services interface with Google Gemini 1.5 Pro and OpenAI GPT-4o, with automatic fallback to curated event domain templates.

---

## 2. Common Operational Tasks

### 2.1 Rotating the JWT Session Signing Key (`AUTH_SECRET`)
1. Generate a new secret: `openssl rand -base64 32`.
2. Update `AUTH_SECRET` in the hosting environment variable manager.
3. Restart the application instances.
4. *Impact:* Users will be required to re-authenticate as existing tokens will fail signature verification.

### 2.2 Adding a New Database Migration
1. Update `prisma/schema.prisma`.
2. Generate migration locally: `npx prisma migrate dev --name <migration_name>`.
3. Commit migration SQL to Git.
4. Deploy to production using: `npx prisma migrate deploy`.

### 2.3 Managing AI Provider Rate Limits & Outages
- If Google Gemini returns 429 (Rate Limit) or 503 (Unavailable), the system automatically degrades gracefully to curated domain fallback templates.
- To switch primary provider to OpenAI, set:
  ```bash
  AI_PROVIDER="openai"
  OPENAI_API_KEY="sk-..."
  OPENAI_MODEL="gpt-4o"
  ```
- To adjust provider timeout threshold (default 15s):
  ```bash
  AI_TIMEOUT_MS="20000"
  ```

---

## 3. Incident Response & Troubleshooting

### Scenario A: Users receive 401 Unauthorized unexpectedly
- Check if server clock has drifted (JWT expiration relies on UTC timestamps).
- Check if `AUTH_SECRET` was changed or is empty in the environment.
- Verify reverse proxy forwards the `eventcraft_session` cookie.

### Scenario B: Database connection pool exhaustion
- Check PostgreSQL `max_connections` setting.
- In serverless / edge environments, configure Prisma with PgBouncer or Supabase connection pooler (`?pgbouncer=true`).

### Scenario C: High latency on Plan Generation
- Inspect provider response times.
- Verify `AI_TIMEOUT_MS` is respected. If the provider exceeds the threshold, the system triggers the fallback template in under 50ms.

---

## 4. Monitoring Recommendations

1. **APM & Error Tracking:** Integrate Sentry (`@sentry/nextjs`) to capture unhandled server action / route handler exceptions.
2. **Database Metrics:** Monitor query latency, active connections, and table lock times on PostgreSQL.
3. **Uptime Monitoring:** Configure external HTTP pings to `/api/auth/me` or `/login`.
