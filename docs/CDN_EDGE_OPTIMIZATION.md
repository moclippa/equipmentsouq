# CDN and Edge Optimization Guide

This document describes the CDN and Edge optimization configuration for EquipmentSouq, specifically designed for users in Saudi Arabia and Bahrain.

## Overview

EquipmentSouq uses a multi-layer caching and edge computing strategy:

1. **Vercel Edge Network** - Global CDN with Middle East PoPs
2. **Cloudflare R2** - Object storage for equipment images
3. **Edge Middleware** - Geographic routing and language detection
4. **Response Caching** - API-level caching with stale-while-revalidate

## Architecture

```
User (SA/BH) --> Vercel Edge (Bahrain/Dubai) --> Next.js App
                      |
                      +--> R2 Cache (Cloudflare Edge)
                      |
                      +--> API Cache (Edge)
                      |
                      +--> Database (Origin)
```

## Regional Deployment Configuration

### Vercel Configuration

#### Recommended Region Settings

In your Vercel project settings, configure:

1. **Primary Region**: `bom1` (Mumbai) or contact Vercel for Middle East region access
2. **Edge Functions**: Enabled globally (runs at nearest edge)
3. **ISR**: Enable Incremental Static Regeneration

#### vercel.json Configuration

```json
{
  "regions": ["bom1"],
  "functions": {
    "src/middleware.ts": {
      "runtime": "edge"
    }
  },
  "crons": [
    {
      "path": "/api/cron/archive-sold",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/expire-booking-requests",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Environment Variables

```env
# Edge Runtime (optional - for edge function hints)
VERCEL_EDGE_REGION=bom1

# Upstash Redis (for rate limiting at edge)
UPSTASH_REDIS_REST_URL=https://YOUR_REGION.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN

# Choose Upstash region closest to your users
# Recommended: ap-south-1 (Mumbai) for SA/BH users
```

### Cloudflare R2 Configuration

#### Bucket Setup

1. Create R2 bucket in the **Middle East region** (if available) or **Europe** (closest)
2. Enable **Cache Reserve** for popular equipment images
3. Configure **Custom Domain** for R2 bucket

#### R2 Cache Rules

Create a Cache Rule for your R2 domain:

```
# Cache equipment images aggressively
If URL path contains "/equipment/"
Then:
  - Cache TTL: 30 days
  - Browser TTL: 7 days
  - Cache Everything: true

# Cache thumbnails at edge
If URL path contains "/thumbnails/"
Then:
  - Cache TTL: 365 days
  - Browser TTL: 30 days
  - Cache Everything: true
```

#### Image Transformation

Consider enabling Cloudflare Images for on-the-fly resizing:

```env
# R2 with Images
CLOUDFLARE_IMAGES_ACCOUNT_ID=your_account_id
CLOUDFLARE_IMAGES_API_TOKEN=your_api_token
```

## Cache Strategy by Resource Type

### Static Assets (Immutable)

| Resource | Cache-Control | CDN TTL | Browser TTL |
|----------|--------------|---------|-------------|
| JS/CSS bundles | `immutable` | 1 year | 1 year |
| Fonts | `immutable` | 1 year | 1 year |
| Static images | `immutable` | 1 year | 1 year |

### Dynamic Content

| Resource | Cache-Control | CDN TTL | Browser TTL | SWR |
|----------|--------------|---------|-------------|-----|
| Homepage | `public, s-maxage=300` | 5 min | 0 | 1 hour |
| Search page | `public, s-maxage=60` | 1 min | 0 | 5 min |
| Equipment detail | `public, s-maxage=300` | 5 min | 0 | 1 hour |
| Categories API | `public, s-maxage=3600` | 1 hour | 0 | 24 hours |
| Equipment list API | `public, s-maxage=60` | 1 min | 0 | 5 min |

### Private Content (No Cache)

| Resource | Cache-Control |
|----------|--------------|
| Auth endpoints | `private, no-cache, no-store` |
| Leads API | `private, no-cache, no-store` |
| Booking requests | `private, no-cache, no-store` |
| Admin API | `private, no-cache, no-store` |
| Business profile | `private, no-cache, no-store` |

## Edge Middleware Features

### Geographic Detection

The middleware automatically detects user location using Vercel's geo headers:

```typescript
// Headers available in your app
X-User-Country: "SA" | "BH" | ...
X-User-City: "Riyadh" | "Manama" | ...
X-User-Region: "01" | "02" | ...
X-User-Locale: "ar" | "en"
X-User-Currency: "SAR" | "BHD"
X-User-Timezone: "Asia/Riyadh" | "Asia/Bahrain"
```

### Language Detection Priority

1. Existing `locale` cookie (user preference)
2. `Accept-Language` header (browser preference)
3. Country-based default (SA/BH -> Arabic, others -> English)

### Rate Limiting

Rate limits are applied at the edge using Upstash Redis:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Registration | 5 | 1 hour |
| OTP send | 5 | 1 hour |
| OTP verify | 10 | 15 min |
| AI endpoints | 20-30 | 1 hour |
| Leads | 20 | 1 hour |
| Equipment CRUD | 30 | 1 hour |
| Default | 100 | 1 min |

## Database Optimization for Middle East

### Connection Pooling

Use connection pooling for better latency:

```env
# Prisma Accelerate or PgBouncer
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
DIRECT_URL="postgresql://..."  # For migrations
```

### Regional Database Options

1. **Supabase** - Has Singapore region (closest to ME)
2. **PlanetScale** - Consider Singapore or EU region
3. **Neon** - AWS ap-south-1 (Mumbai) available
4. **Railway** - Various regions available

#### Recommended: Neon with Connection Pooling

```env
# Neon Serverless with pooling
DATABASE_URL="postgres://user:pass@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgres://user:pass@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require"
```

## Performance Monitoring

### Vercel Analytics

Enable Vercel Analytics to monitor:
- Edge function execution time
- Geographic distribution of requests
- Cache hit rates

### Core Web Vitals Targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP | < 2.5s | Monitor |
| FID | < 100ms | Monitor |
| CLS | < 0.1 | Monitor |
| TTFB | < 800ms | Monitor |

### Monitoring Headers

The middleware adds headers for debugging:

```
X-Edge-Cache-Tag: locale:ar,country:SA
X-Edge-Region: me-south-1
```

## Security Headers

All responses include security headers:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` |

## Deployment Checklist

### Pre-Deployment

- [ ] Configure Vercel region (bom1 recommended)
- [ ] Set up Upstash Redis in ap-south-1
- [ ] Configure R2 bucket with caching rules
- [ ] Add all environment variables
- [ ] Enable Vercel Analytics

### Post-Deployment

- [ ] Verify edge middleware is running (check response headers)
- [ ] Test from SA/BH IP (use VPN or proxy)
- [ ] Monitor cache hit rates in Vercel dashboard
- [ ] Check Core Web Vitals scores
- [ ] Verify rate limiting works

### Testing from Middle East

Use these tools to test from SA/BH:
1. **Vercel Preview** with geographic testing
2. **WebPageTest** - Select Middle East test location
3. **VPN** - Connect to SA/BH server for real testing

## Cost Optimization

### Vercel Costs

- **Edge Functions**: Included in Pro plan
- **Bandwidth**: Monitor usage, consider upgrading if needed
- **ISR**: Free with Pro plan

### R2 Costs

- **Storage**: $0.015/GB/month
- **Operations**: $0.36/million Class A, $0.36/million Class B
- **Egress**: Free!

### Upstash Costs

- **Free tier**: 10,000 requests/day
- **Pay-as-you-go**: $0.2/100K requests

## Troubleshooting

### High Latency from SA/BH

1. Check if requests are hitting Mumbai region
2. Verify R2 cache is warm (first request is cold)
3. Check database connection latency
4. Enable Prisma Accelerate for connection pooling

### Cache Not Working

1. Check `Cache-Control` header in response
2. Verify no `Authorization` header for public endpoints
3. Check `Vary` header configuration
4. Test with `curl -I` to see headers

### Rate Limiting Issues

1. Check Upstash Redis connection
2. Verify `x-forwarded-for` header for real IP
3. Check rate limit headers in response
4. Test fallback in-memory rate limiting

## Future Improvements

1. **Vercel Edge Config** - Store categories in edge config for faster access
2. **Regional Database Replica** - Read replica in ME region
3. **Image CDN** - Cloudflare Images for automatic resizing
4. **Preconnect Hints** - Add preconnect for known domains
5. **Service Worker** - Offline support for listings

## Related Files

- `/next.config.ts` - Next.js configuration with caching headers
- `/src/middleware.ts` - Edge middleware with geo detection
- `/vercel.json` - Vercel deployment configuration
- `/src/app/api/categories/route.ts` - Example of cached API route
