# Production Deployment Guide — EventCraft AI

## 1. Supported Runtime & Prerequisites

- **Node.js:** v18.18+ or v20+ LTS (verified on Node.js v22/v26).
- **Package Manager:** npm (v9+) or pnpm.
- **Database:** PostgreSQL 15+ (PostgreSQL 16 recommended).
- **Reverse Proxy / SSL:** Cloudflare, AWS CloudFront/ALB, or Nginx with valid TLS certificate for HTTPS.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.production` and populate with production credentials:

```bash
# PostgreSQL Connection String (Pooler or Direct)
DATABASE_URL="postgresql://user:strong_password@db-host:5432/eventcraft_prod?schema=public&sslmode=require"

# JWT Signing Secret (Generate using: openssl rand -base64 32)
AUTH_SECRET="secure-random-32-plus-characters-long-jwt-signing-key"

# Application URL
NEXTAUTH_URL="https://app.eventcraft.ai"
APP_ENV="production"
APP_URL="https://app.eventcraft.ai"

# AI Provider Configuration ("gemini" | "openai")
AI_PROVIDER="gemini"
AI_TIMEOUT_MS="15000"

# Google Gemini API
GEMINI_API_KEY="AIzaSyYourProductionGeminiKey"
GEMINI_MODEL="gemini-1.5-pro"

# OpenAI API (if configured as primary or alternative)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o"
```

---

## 3. Database Migration Procedure

Never run `prisma db push` in production. Always apply committed Prisma migrations sequentially:

```bash
# 1. Install locked dependencies
npm ci

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Apply committed migrations to production database
npx prisma migrate deploy
```

---

## 4. Build & Service Launch

```bash
# 1. Build optimized production bundle
npm run build

# 2. Start Next.js production server (listens on port 3000 by default)
npm run start
```

For containerized deployments, use the following `Dockerfile` pattern:
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 5. Pre-Flight Smoke Test Procedure

After deploying to staging or production:
1. **Health Check:** Load `/login` and verify HTTP 200 with security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
2. **User Registration:** Register a test account (`test-smoke@eventcraft.ai`). Verify session cookie `eventcraft_session` is set with `HttpOnly`, `SameSite=lax`, and `Secure` (over HTTPS).
3. **Event Wizard:** Complete the 5-step wizard to create a draft wedding or birthday. Verify autosave persistence.
4. **Plan Generation:** Generate a plan. Confirm theme concepts, budget allocations, and day-of schedule populate.
5. **Ledger & Expenses:** Add a budget category and record a test expense. Verify utilization and remaining balance.
6. **Task Operations:** Transition a task from `TODO` to `IN_PROGRESS` to `COMPLETED`.
7. **Vendor & Quotations:** Add a vendor, log a quote, and select the quote.
8. **Conversational Revision:** Submit `"Adjust total budget to $22,000"`. Confirm preview diff appears and click "Confirm & Apply".
9. **Sign Out:** Click logout and verify cookie is cleared.

---

## 6. Rollback & Disaster Recovery

- **Application Rollback:** Re-deploy the previous container image or Git commit tag.
- **Database Backup:** Ensure automated daily WAL backups are enabled on PostgreSQL.
- **Migration Rollback:** If a migration fails, inspect `_prisma_migrations` table and apply a compensating forward migration.
