# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EquipmentSouq is a **Haraj-style classifieds platform** for heavy equipment rental and sale in Saudi Arabia and Bahrain. Owners list equipment, renters browse and submit contact requests (leads), then parties negotiate directly via phone/WhatsApp.

**Domain**: equipmentsouq.com
**Business Model**: Lead-gen (direct contact, no managed payments)
**What we manage**: Listings, search, leads, SMS notifications
**What we don't manage**: Payments, bookings, calendars, escrow

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 + Prisma 7 |
| Auth | NextAuth.js v5-beta (email + phone OTP) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI | Claude (via @anthropic-ai/sdk), Gemini fallback |
| i18n | next-intl (Arabic + English, RTL) |
| SMS | Twilio (OTP + lead notifications) |
| Storage | S3/R2 compatible (presigned uploads) |
| Caching | Upstash Redis (rate limiting + caching) |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start PostgreSQL (if using Docker)
docker run -d --name equipmentsouq-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=equipmentsouq \
  -p 5432:5432 postgres:16

# Run database migrations
npx prisma migrate dev

# Seed initial data (categories)
npx prisma db seed

# Start development server
npm run dev
```

## Project Structure

```
equipmentsouq/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Public landing pages
│   │   ├── (auth)/             # Login, register, verify
│   │   ├── (dashboard)/        # Protected user dashboard
│   │   ├── (search)/           # Public search & equipment
│   │   ├── admin/              # Admin panel
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Header, footer, sidebar
│   │   ├── forms/              # Form components
│   │   ├── features/           # Feature-specific
│   │   └── providers/          # Context providers
│   ├── lib/
│   │   ├── prisma.ts           # Database client
│   │   ├── auth.ts             # NextAuth config
│   │   ├── ai/                 # Multi-provider AI
│   │   ├── payments/           # Payment abstraction
│   │   └── utils/              # Helpers
│   ├── services/               # Business logic
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript definitions
│   └── i18n/                   # Internationalization
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── messages/                   # Translation files
│   ├── en.json
│   └── ar.json
└── docs/                       # Documentation
```

## Commands

```bash
# Development
npm run dev                     # Dev server at localhost:3000
npm run build                   # Production build
npm run lint                    # ESLint

# Database
npm run db:seed                 # Seed categories (46 total)
npm run db:reset                # Reset and reseed database
npx prisma migrate dev          # Create/apply migrations
npx prisma studio               # Visual database browser
npx prisma generate             # Regenerate client after schema changes

# Type checking
npx tsc --noEmit
```

## Database Schema

**Core**: User (GUEST/RENTER/OWNER/ADMIN), BusinessProfile, Category (hierarchical)
**Listings**: Equipment, EquipmentImage, Lead
**System**: Notification, OTPCode, AdminConfig, AdminAuditLog, AIUsageLog, AnalyticsEvent

Key enums: `ListingType` (FOR_RENT/FOR_SALE/BOTH), `LeadStatus` (NEW/VIEWED/CONTACTED/CONVERTED/CLOSED)

## Architecture

### Authentication (`src/lib/auth.ts`)
Two providers via NextAuth.js v5:
- **credentials**: Email + password login
- **phone-otp**: SMS OTP for KSA (+966) and Bahrain (+973) numbers

Session extends with: `id`, `role`, `fullName`, `phone`, `preferredLanguage`, `preferredCurrency`, `country`, `businessProfileId`

### AI Services (`src/lib/ai/`)
| Endpoint | Purpose |
|----------|---------|
| `/api/ai/parse-document` | OCR CR/VAT documents |
| `/api/ai/classify-equipment` | Photo → make/model/year |
| `/api/ai/generate-listing` | Bilingual title/description |
| `/api/ai/suggest-price` | Market-based pricing |

AI client pattern: `src/lib/ai/client.ts` (Claude primary), `src/lib/ai/gemini-client.ts` (fallback)

### i18n (`src/i18n/`)
- Locale detection: cookie → Accept-Language header → default (en)
- Translation files: `messages/en.json`, `messages/ar.json`
- RTL support: Use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`)

### Route Groups
- `(auth)`: Login, register, verify-otp (public)
- `(dashboard)`: Protected user pages (my-listings, my-leads, onboarding)
- `(search)`: Public search and equipment detail
- `admin`: Admin panel (role-protected)

### Caching & Rate Limiting (`src/lib/cache.ts`, `src/middleware.ts`)
Uses Upstash Redis for serverless-compatible distributed caching and rate limiting:

**Cache TTLs**:
- Categories: 24 hours (static data)
- Featured equipment: 1 hour
- Stats: 5 minutes
- User sessions: 30 minutes

**Rate Limits** (sliding window):
- Auth endpoints: 5 req/hour (register, OTP send)
- AI endpoints: 20-30 req/hour
- User actions: 20-50 req/hour
- Default: 100 req/minute

**Graceful fallback**: When Redis is unavailable, falls back to in-memory (limited in serverless)

## Environment Variables

Required:
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Optional (for full functionality):
```env
ANTHROPIC_API_KEY=...            # AI features
GOOGLE_GENERATIVE_AI_API_KEY=... # AI fallback (Gemini)
TWILIO_ACCOUNT_SID=...           # OTP + lead notifications
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
S3_ENDPOINT=...                  # File uploads
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
UPSTASH_REDIS_REST_URL=...       # Rate limiting + caching
UPSTASH_REDIS_REST_TOKEN=...
```

## Code Patterns

### API Routes
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ ... });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const data = schema.parse(body);
  // ...
}
```

### Protected Pages
```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // ...
}
```

## API Endpoints

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/otp/send` - Send SMS OTP

### Equipment
- `GET/POST /api/equipment` - List/create
- `GET/PATCH/DELETE /api/equipment/[id]` - CRUD

### Leads
- `GET/POST /api/leads` - List (owner) / Create (renter)
- `GET/PATCH /api/leads/[id]` - Detail / Update status

### AI
- `POST /api/ai/parse-document` - OCR documents
- `POST /api/ai/classify-equipment` - Photo classification
- `POST /api/ai/generate-listing` - Content generation

### Admin
- `GET/PATCH /api/admin/verifications/[id]` - Business verification

## Development Notes

**OTP in development**: Check console for `[DEV] OTP for +966...: 123456`

**Database reset**: `npm run db:reset` (clears all data, reseeds categories)

**RTL styling**: Always use logical CSS properties (`ms-*`, `me-*`, `start-*`, `end-*`) instead of directional (`ml-*`, `mr-*`, `left-*`, `right-*`)

## Current Status

See `docs/IMPLEMENTATION_STATUS.md` for detailed sprint progress.

**Completed**: Foundation, Auth, Business Onboarding, Equipment Listing, Search & Discovery, Classifieds Pivot
**In Progress**: Admin Panel (user management, analytics remaining)
