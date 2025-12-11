# EquipmentSouq Implementation Status

Last Updated: 2025-12-10 (Sprint 12: Complete + Availability Calendar Feature)

## Business Model Pivot

**PIVOTED** from full rental marketplace to **Haraj-style classifieds/lead-gen model**.

**New Business Model:**
- Owner lists equipment for rent/sale
- Renter finds equipment
- Renter clicks "Contact Owner"
- Owner gets SMS notification
- They negotiate directly

**What We DON'T Manage:** Payments, bookings, calendars, escrow, check-in/out
**What We DO Manage:** Listings, search, leads, notifications

---

## Sprint Overview

| Sprint | Name | Status |
|--------|------|--------|
| 0 | Foundation | Completed |
| 1 | Business Onboarding | Completed |
| 2-3 | Equipment Listing | Completed |
| 4 | Search & Discovery | Completed |
| 5 | ~~Booking Flow~~ | **REMOVED** (Pivot) |
| C1 | Classifieds Pivot | **Completed** |
| 6 | ~~Payments Integration~~ | **REMOVED** (Pivot) |
| 7 | ~~Check-in/Check-out~~ | **REMOVED** (Pivot) |
| 8 | ~~Messaging & Notifications~~ | **REMOVED** (Pivot - Using direct contact) |
| 9 | ~~Ratings & Trust~~ | **REMOVED** (Pivot) |
| 10 | ~~Payouts~~ | **REMOVED** (Pivot) |
| 11 | Admin Panel | **Completed** |
| 12 | Polish & Launch | **Completed** |
| 13 | Availability Calendar | **Completed** |

---

## Sprint 13: Availability Calendar - COMPLETED

### Features Implemented
- [x] "Mark as Available" option for RENTED/SOLD/PAUSED listings
- [x] AvailabilityBlock model in Prisma schema (date ranges, availability status, reason)
- [x] Availability calendar API endpoints (`/api/equipment/[id]/availability`)
  - GET: Fetch availability blocks for equipment
  - POST: Create new availability block (with overlap validation)
  - DELETE: Remove availability block
- [x] AvailabilityCalendar UI component with:
  - Visual calendar with red (unavailable) and green (available) highlighting
  - Date range selection for adding blocks
  - List of existing blocks with delete option
  - Support for reasons (maintenance, rented externally, etc.)
- [x] Calendar integrated into equipment edit page (shown for rental listings)

### Key Files Created
- `prisma/schema.prisma` - Added AvailabilityBlock model
- `src/app/api/equipment/[id]/availability/route.ts` - Availability API
- `src/components/features/listings/availability-calendar.tsx` - Calendar UI component

### Key Files Modified
- `src/components/features/listings/listing-actions.tsx` - Added "Mark as Available" option
- `src/app/(dashboard)/my-listings/[id]/edit/page.tsx` - Integrated AvailabilityCalendar

---

## Sprint C1: Classifieds Pivot - COMPLETED

### Phase 1: Schema Migration
- [x] Removed 8 models: Booking, Payment, Payout, Inspection, InspectionPhoto, Message, Rating, Dispute, AvailabilityBlock
- [x] Removed old enums: BookingStatus, PaymentStatus, InspectionType, DisputeStatus, DisputeResolution
- [x] Added new enums: ListingType (FOR_RENT, FOR_SALE, BOTH), LeadStatus (NEW, VIEWED, CONTACTED, CONVERTED, CLOSED)
- [x] Simplified ListingStatus: DRAFT, ACTIVE, RENTED, SOLD, PAUSED, ARCHIVED
- [x] Simplified Equipment model with classifieds fields
- [x] Added Lead model for contact requests

### Phase 2: API Refactor
- [x] Deleted `/api/bookings/route.ts`
- [x] Deleted `/api/bookings/[id]/route.ts`
- [x] Deleted `/api/bookings/[id]/messages/route.ts`
- [x] Simplified `/api/equipment/route.ts` (removed booking fields, added classifieds fields)
- [x] Simplified `/api/equipment/[id]/route.ts`
- [x] Created `/api/leads/route.ts` (POST create, GET list)
- [x] Created `/api/leads/[id]/route.ts` (GET, PATCH status)

### Phase 3: Frontend Refactor
- [x] Deleted `/bookings/page.tsx` and `/bookings/[id]/page.tsx`
- [x] Deleted `components/features/booking/booking-form.tsx`
- [x] Simplified equipment listing wizard (6 steps)
- [x] Simplified pricing-step.tsx (listingType, rentalPrice, salePrice, priceOnRequest)
- [x] Simplified review-step.tsx for classifieds
- [x] Updated equipment detail page with Contact Owner CTA
- [x] Created contact form component (`features/leads/contact-form.tsx`)
- [x] Created lead card component (`features/leads/lead-card.tsx`)
- [x] Created owner leads dashboard (`/my-leads/page.tsx`)

### Phase 4: Notifications
- [x] Created SMS notification helper (`/lib/notifications/sms.ts`)
- [x] Owner SMS notification on new lead
- [x] Updated admin dashboard for classifieds (leads instead of bookings/disputes)

### Key Files Changed/Created

**Deleted:**
- `src/app/api/bookings/route.ts`
- `src/app/api/bookings/[id]/route.ts`
- `src/app/api/bookings/[id]/messages/route.ts`
- `src/app/(dashboard)/bookings/page.tsx`
- `src/app/(dashboard)/bookings/[id]/page.tsx`
- `src/components/features/booking/booking-form.tsx`
- `src/components/features/booking/index.ts`

**Created:**
- `src/app/api/leads/route.ts` - Lead API (create, list)
- `src/app/api/leads/[id]/route.ts` - Lead detail API (get, update status)
- `src/app/(dashboard)/my-leads/page.tsx` - Owner leads dashboard
- `src/components/features/leads/contact-form.tsx` - Contact Owner form
- `src/components/features/leads/lead-card.tsx` - Lead display card
- `src/components/features/leads/index.ts` - Leads exports
- `src/lib/notifications/sms.ts` - SMS notification helper

**Modified:**
- `prisma/schema.prisma` - Major simplification
- `src/app/api/equipment/route.ts` - Classifieds fields
- `src/app/api/equipment/[id]/route.ts` - Classifieds fields
- `src/app/(search)/equipment/[id]/page.tsx` - Contact Owner CTA
- `src/app/(dashboard)/equipment/new/page.tsx` - Simplified form data
- `src/components/features/equipment/pricing-step.tsx` - Classifieds pricing
- `src/components/features/equipment/review-step.tsx` - Classifieds review
- `src/components/features/equipment/details-step.tsx` - Removed serialNumber
- `src/app/admin/page.tsx` - Leads instead of bookings/disputes

---

## Sprint 0: Foundation - COMPLETED

### Completed Tasks
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 setup
- [x] shadcn/ui component library integration
- [x] PostgreSQL + Prisma ORM configuration
- [x] NextAuth.js v5 authentication (email/password + phone OTP providers)
- [x] Phone OTP authentication flow (KSA/BHR numbers)
- [x] i18n setup with next-intl (Arabic/English + RTL support)
- [x] Auth pages: Login, Register, Verify OTP
- [x] Session provider integration
- [x] Landing page with hero, categories, and how-it-works sections
- [x] Dashboard layout with navigation
- [x] Category seeding (46 equipment categories: 7 parent + 39 children)

---

## Sprint 1: Business Onboarding - COMPLETED

### Completed Tasks
- [x] 5-step onboarding wizard UI
- [x] Business type selection (Individual, Rental Company, Contractor, Industrial)
- [x] Company details form (name EN/AR, CR, VAT, city, address)
- [x] Document upload step (CR and VAT certificates)
- [x] Bank details step (bank name, account holder, IBAN)
- [x] Review and submit step
- [x] Business profile API endpoint (POST/GET)
- [x] Admin verification dashboard
- [x] Admin verification queue with filtering
- [x] Admin verification detail page
- [x] Admin verification API (approve/reject)
- [x] File upload to S3/R2 storage (with presigned URLs)
- [x] AI document parsing (OCR CR/VAT documents with Claude Vision)

---

## Sprint 2-3: Equipment Listing - COMPLETED (Simplified for Classifieds)

### Completed Tasks
- [x] 6-step listing wizard UI
- [x] Category selection step with hierarchical display
- [x] Photo upload step with drag-drop and primary photo selection
- [x] Equipment details step (make, model, year, condition, hours used)
- [x] Specifications step with dynamic fields based on category
- [x] Pricing step (listingType, rentalPrice/unit, salePrice, priceOnRequest, contact info)
- [x] Review step with full listing preview
- [x] AI photo classification (equipment recognition from images)
- [x] AI content generation (bilingual title/description from details)
- [x] Equipment CRUD API (create, read, update, delete)
- [x] Categories API with filtering

### AI Features
| Feature | Description | Status |
|---------|-------------|--------|
| Photo Classification | Detects make, model, year from equipment photos | Working |
| Content Generation | Creates bilingual (EN/AR) titles and descriptions | Working |
| Document Parsing | Extracts CR/VAT info from uploaded documents | Working |

---

## Sprint 4: Search & Discovery - COMPLETED

### Completed Tasks
- [x] Search page with full-text search
- [x] Category filter dropdown
- [x] Location filters (country, city)
- [x] Condition filter
- [x] Price range filter
- [x] Listing type filter (For Rent, For Sale, Both)
- [x] Sort options (newest, price)
- [x] Pagination
- [x] URL-driven filter state (bookmarkable searches)
- [x] Mobile-responsive filter sheet
- [x] Equipment card grid with badges
- [x] Equipment detail page with image gallery
- [x] Owner profile display
- [x] Specifications display
- [x] Pricing display (rental and/or sale)
- [x] Contact Owner CTA with form

---

## Sprint 11: Admin Panel - COMPLETED

### Completed Tasks
- [x] Admin layout with sidebar navigation
- [x] Admin dashboard with key metrics (users, verifications, equipment, leads)
- [x] Quick actions panel
- [x] Business verification queue with status filtering
- [x] Verification detail page with full business info
- [x] Approve/reject verification workflow
- [x] User management page with search, filtering, pagination
- [x] User detail page with profile, stats, equipment, business info
- [x] User actions (suspend/reactivate, role change) with audit logging
- [x] Equipment listing management with filters (status, type, country)
- [x] Leads overview page with status distribution cards
- [x] Platform analytics (country distribution, growth metrics, top performers)
- [x] Recent activity feeds (users, leads)

### Remaining Tasks (Future Sprint)
- [ ] Category management (add/edit/reorder categories)
- [ ] Admin settings page
- [ ] Audit log viewer

---

## Database Schema Status (Post-Pivot)

### Active Models
- [x] User (GUEST, RENTER, OWNER, ADMIN roles)
- [x] BusinessProfile (company details, CR/VAT verification)
- [x] Category (hierarchical equipment categories)
- [x] Equipment (simplified with listingType, rentalPrice, salePrice, contactPhone, contactWhatsApp)
- [x] EquipmentImage
- [x] Lead (contact requests with status tracking)
- [x] Notification (multi-channel)
- [x] OTPCode (phone verification)

### Removed Models (Pivot)
- ~~Booking~~ (replaced by Lead)
- ~~Payment~~ (direct negotiation)
- ~~Payout~~ (direct payment)
- ~~Inspection~~ (no managed check-in/out)
- ~~InspectionPhoto~~ (no managed check-in/out)
- ~~Message~~ (direct contact via phone/WhatsApp)
- ~~Rating~~ (no managed transactions)
- ~~Dispute~~ (no managed transactions)

### Re-added Models (Sprint 13)
- [x] AvailabilityBlock (for owner availability calendar - simpler than before)

---

## Tech Stack Versions

| Technology | Version |
|------------|---------|
| Next.js | 16.0.8 |
| React | 19 |
| TypeScript | 5.7 |
| Prisma | 7.2.0 |
| NextAuth.js | 5.0.0-beta.28 |
| Tailwind CSS | 4.0.6 |
| shadcn/ui | Latest |
| PostgreSQL | 16 |

---

## API Endpoints (Current)

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth.js handlers |
| `/api/auth/register` | POST | User registration |
| `/api/auth/otp/send` | POST | Send OTP via SMS |

### Business
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/business-profile` | GET/POST | Business profile CRUD |
| `/api/admin/verifications/[id]` | GET/PATCH | Admin verification |

### Admin User Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users/[id]/suspend` | POST | Suspend user account |
| `/api/admin/users/[id]/reactivate` | POST | Reactivate suspended user |
| `/api/admin/users/[id]/role` | PATCH | Change user role |

### Equipment (Classifieds)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/equipment` | GET/POST | List/create equipment |
| `/api/equipment/[id]` | GET/PATCH/DELETE | Equipment detail CRUD |
| `/api/equipment/[id]/availability` | GET/POST/DELETE | Availability blocks CRUD |
| `/api/categories` | GET | List categories |

### Leads (New)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | GET/POST | List leads (owner) / Create lead |
| `/api/leads/[id]` | GET/PATCH | Lead detail / Update status |

### AI Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/parse-document` | POST | OCR CR/VAT documents |
| `/api/ai/classify-equipment` | POST | Classify equipment from photo |
| `/api/ai/generate-listing` | POST | Generate bilingual listing content |

### Storage
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Get presigned upload URL |

---

## Environment Setup

Required environment variables:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Optional (for full functionality):
```
ANTHROPIC_API_KEY=...     # AI features (Claude Sonnet 4)
TWILIO_ACCOUNT_SID=...    # Phone OTP & Lead notifications
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
S3_ENDPOINT=...           # File uploads (S3/R2)
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## User Flows

### Owner Flow (List & Receive Leads)
```
1. Register/Login (phone OTP)
2. Create listing:
   - Photos (1-10)
   - Category, Make, Model, Year
   - Condition
   - Price: "X SAR/day" or "X SAR to buy" or "Contact for price"
   - Location (city)
   - Phone + WhatsApp
3. Listing goes live immediately (no approval needed for MVP)
4. Receive SMS when someone's interested
5. View leads in /my-leads dashboard
6. Contact them via phone/WhatsApp
```

### Renter Flow (Find & Contact)
```
1. Browse/search equipment
2. View listing detail
3. Click "Contact Owner"
4. Fill simple form: Name, Phone, Message, Interest (rent/buy/both)
5. Owner's contact info revealed
6. Done - they negotiate directly
```

---

## Success Metrics (Classifieds MVP)

- [x] Owner can list equipment in < 2 minutes
- [x] Renter can find and contact owner in < 1 minute
- [x] Owner receives SMS notification on new lead
- [x] WhatsApp link works correctly
- [x] Owner can see all leads in dashboard

---

## Future Monetization (Post-Volume)

1. **Featured Listings** - Pay to appear at top
2. **Bump to Top** - Refresh listing position
3. **Verified Seller Badge** - Trust signal
4. **Lead Fees** - Charge per qualified lead (once volume exists)
5. **Premium Accounts** - Unlimited listings, analytics

---

## Sprint 12: Polish & Launch - COMPLETED

### Landing Page Polish
- [x] Hero section updated for classifieds model (direct contact messaging)
- [x] Added search bar in hero section
- [x] Trust indicators section (Free to List, Verified Owners, Direct Contact, WhatsApp)
- [x] Featured equipment section with live data from database
- [x] "For Equipment Owners" section with benefits
- [x] Updated "How It Works" to reflect classifieds flow
- [x] Stats section with real platform data
- [x] Improved footer with navigation columns
- [x] Sticky header with backdrop blur

### SEO Optimization
- [x] Enhanced metadata with expanded keywords (EN + AR)
- [x] OpenGraph and Twitter cards configured
- [x] Viewport configuration with theme colors
- [x] robots.ts with proper crawl rules
- [x] sitemap.ts with dynamic equipment and category pages
- [x] JSON-LD structured data components:
  - OrganizationSchema
  - WebsiteSchema with SearchAction
  - EquipmentSchema (for product pages)
  - BreadcrumbSchema
  - FAQSchema
  - LocalBusinessSchema

### Mobile Responsiveness
- [x] Verified responsive grids on all pages
- [x] Logical CSS properties (start/end) for RTL support
- [x] Mobile filter sheets on search page
- [x] Sticky pricing card on equipment detail

### Performance Optimization
- [x] Image optimization with AVIF/WebP formats
- [x] Device-specific image sizes configured
- [x] 30-day image cache TTL
- [x] Aggressive static asset caching headers
- [x] Compression enabled
- [x] Skeleton loading components created
- [x] Removed X-Powered-By header
- [x] X-Frame-Options DENY for security

---

## Platform Status: READY FOR LAUNCH

All core features are complete:
- User registration with phone OTP
- Business profile onboarding with AI document parsing
- Equipment listing wizard with AI content generation
- Search & discovery with filters
- Lead management (contact owner flow)
- Admin panel with full oversight

## Post-Launch Features (Future)
- Featured listings monetization
- Email notifications
- Search alerts
- Category management in admin
- Testimonials section with real reviews
