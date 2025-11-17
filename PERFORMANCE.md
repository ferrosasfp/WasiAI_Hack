# Performance Optimization Guide

## Overview
This document outlines the performance optimizations implemented to achieve instant perceived navigation and fast page loads.

## Key Metrics & Targets

### Navigation Performance
- **Desktop**: ≤150–200ms (click → first meaningful paint)
- **Mobile 4G**: ≤300ms
- **LCP**: ≤1.8s
- **TTFB**: ≤200ms on cacheable pages
- **Initial JS bundle**: ≤150kB

### Core Web Vitals Targets
- ✅ LCP (Largest Contentful Paint): < 1.8s
- ✅ FID/INP (First Input Delay/Interaction to Next Paint): < 200ms
- ✅ CLS (Cumulative Layout Shift): < 0.1

## Implemented Optimizations

### 1. Loading States & Skeletons ✅
**Files:**
- `/src/app/[locale]/evm/models/[id]/loading.tsx`
- `/src/app/[locale]/models/loading.tsx`

**Impact:** Eliminates blank screens during navigation. Users see instant feedback.

**Implementation:**
```tsx
// Next.js automatically shows loading.tsx while page loads
export default function Loading() {
  return <Skeleton variant="..." />
}
```

### 2. Top Progress Bar ✅
**File:** `/src/components/TopProgressBar.tsx`

**Features:**
- 150ms threshold (only shows for slow navigations)
- Smooth progress simulation
- Auto-completes on route change

**Impact:** Visual feedback for slower navigations without blocking fast ones.

### 3. Smart Prefetching ✅
**File:** `/src/lib/prefetch.ts`

**Hooks:**
- `usePrefetch(href)` - Hover-based prefetching with debounce
- `useInstantPrefetch(hrefs[])` - Eager prefetch for critical routes

**Implementation:**
```tsx
// In ModelCard component
const { prefetch, cancel } = usePrefetch(href)

<Card 
  onMouseEnter={prefetch}
  onMouseLeave={cancel}
  onTouchStart={prefetch}
>
```

**Impact:** Routes preload on hover, making navigation feel instant.

### 4. Web Vitals Monitoring ✅
**File:** `/src/components/WebVitals.tsx`

**Features:**
- Automatic Core Web Vitals tracking
- Custom navigation timing
- Development console warnings
- Production analytics integration

**Metrics Tracked:**
- LCP, FID, CLS, FCP, TTFB, INP
- Custom navigation time
- Per-route performance

### 5. Font Optimization ✅
**File:** `/src/app/layout.tsx`

**Optimizations:**
- `display: 'swap'` - Prevents FOIT (Flash of Invisible Text)
- `preload: true` - Priority loading
- `variable: '--font-roboto'` - CSS variable for flexibility

### 6. Image Optimization Component
**File:** `/src/components/OptimizedImage.tsx`

**Features:**
- Automatic skeleton during load
- Error handling with fallback
- Lazy loading (except priority images)
- Aspect ratio preservation
- next/image automatic optimization

**Usage:**
```tsx
<OptimizedImage
  src="/hero.jpg"
  aspectRatio={16/9}
  priority={true}  // Only for above-the-fold
/>
```

## Best Practices

### Route-Level Optimizations

#### 1. Loading States
Every route with data fetching should have a `loading.tsx`:
```
/app/[locale]/models/
  ├── page.tsx
  └── loading.tsx  ✅
```

#### 2. Streaming with Suspense
For heavy sections, wrap in Suspense:
```tsx
<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

#### 3. Dynamic Imports
For large components only needed sometimes:
```tsx
const HeavyEditor = dynamic(() => import('./HeavyEditor'), {
  loading: () => <Skeleton variant="rectangular" height={400} />,
  ssr: false  // if client-only
})
```

### Image Best Practices

1. **Hero/Above-fold images**: Use `priority={true}`
```tsx
<Image src="/hero.jpg" priority alt="Hero" />
```

2. **Below-fold images**: Let lazy load
```tsx
<Image src="/content.jpg" loading="lazy" alt="Content" />
```

3. **Optimize source images**:
   - Use appropriate sizes (don't serve 4K for thumbnails)
   - Use modern formats (WebP, AVIF)
   - Let next/image handle optimization

### Prefetch Strategy

1. **Header Navigation**: Eager prefetch on mount
```tsx
useInstantPrefetch(['/models', '/publish', '/licenses'])
```

2. **Model Cards**: Hover prefetch
```tsx
const { prefetch, cancel } = usePrefetch(href)
<Card onMouseEnter={prefetch} onMouseLeave={cancel}>
```

3. **Wizard Steps**: Prefetch next step on current step load

### Bundle Optimization

1. **Code Splitting**: Use dynamic imports for:
   - Chart libraries
   - Rich text editors
   - Heavy visualization components
   - Admin panels

2. **Tree Shaking**: Import only what you need
```tsx
// ❌ Bad
import * as _ from 'lodash'

// ✅ Good
import debounce from 'lodash/debounce'
```

## Monitoring & Debugging

### Development
Run your app and check console for:
- `[Web Vitals]` logs for each metric
- `[Navigation Time]` for route transitions
- Warnings for metrics exceeding thresholds

### Production
Web Vitals data is sent to `/api/web-vitals`. Set up your analytics endpoint:

```typescript
// /app/api/web-vitals/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  
  // Send to your analytics (Vercel Analytics, Google Analytics, etc.)
  await analytics.track('web-vital', body)
  
  return new Response('OK', { status: 200 })
}
```

### Lighthouse
Run regular Lighthouse audits:
```bash
npm run build
npm start
# In Chrome DevTools: Lighthouse tab → Generate report
```

Target scores:
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

## Performance Budget

### JavaScript Bundle
- **Initial**: ≤150kB gzipped
- **Per route**: ≤100kB additional

### Images
- Hero images: ≤200kB (with WebP)
- Thumbnails: ≤50kB
- Icons: Use SVG or icon fonts

### API Responses
- Listing pages: ≤100kB
- Detail pages: ≤200kB
- Use pagination and infinite scroll

## Testing Checklist

Before deploying:
- [ ] All routes have loading.tsx
- [ ] Hero images have priority
- [ ] Heavy components use dynamic imports
- [ ] Navigation prefetch works
- [ ] Lighthouse score > 95
- [ ] Web Vitals in green
- [ ] No layout shifts (CLS < 0.1)
- [ ] Fast 3G test passes (≤5s LCP)

## Future Optimizations

1. **Service Worker**: Offline support + aggressive caching
2. **Edge Caching**: Cache public pages at CDN edge
3. **Partial Pre-rendering**: Stream static shell, load dynamic content
4. **Font Subsetting**: Only load characters you need
5. **Critical CSS**: Inline above-the-fold CSS

## Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
