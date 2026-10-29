# Production Deployment Guide — EventCraft AI

## 1. Supported Runtime & Prerequisites

- **Node.js:** v18.18+ or v20+ LTS (verified on Node.js v22/v26).
- **Package Manager:** npm (v9+) or pnpm.
- **Database:** None required. All data persists client-side in browser IndexedDB.
- **Hosting:** Any static hosting provider (Vercel, Netlify, Cloudflare Pages, GitHub Pages) or standard Node.js server/container.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.production` if customizing application display properties:

```bash
NEXT_PUBLIC_APP_NAME="EventCraft AI"
NEXT_PUBLIC_APP_ENV="production"
NEXT_PUBLIC_APP_URL="https://app.eventcraft.ai"
```

No external connection strings, authentication secrets, or external credentials are required.

---

## 3. Build & Service Launch

```bash
# 1. Install dependencies
npm ci

# 2. Build optimized production bundle
npm run build

# 3. Start Next.js production server (listens on port 3000 by default)
npm run start
```

For containerized deployments, use the following `Dockerfile` pattern:
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 4. Pre-Flight Smoke Test Procedure

After deploying:
1. **Health Check:** Load `/login` and verify HTTP 200 with standard response headers.
2. **Profile Selection:** Create or select a local browser profile.
3. **Event Wizard:** Complete the 5-step wizard to create an event. Verify IndexedDB autosave persistence.
4. **Plan Generation:** Generate a local plan. Confirm theme concepts, budget allocations, and day-of schedule populate.
5. **Ledger & Expenses:** Add a budget category and record a test expense. Verify utilization and remaining balance.
6. **Task Operations:** Transition a task from `TODO` to `IN_PROGRESS` to `COMPLETED`.
7. **Vendor & Quotations:** Add a vendor, log a quote, and select the quote.
8. **Conversational Revision:** Submit `"Adjust total budget to $22,000"`. Confirm preview diff appears and click "Confirm & Apply".
9. **Backup & Recovery:** Export database backup from `/settings` and verify the generated JSON file.
