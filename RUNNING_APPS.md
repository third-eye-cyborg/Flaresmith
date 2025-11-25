# Running Applications Status

Generated: November 24, 2025
**Last Updated**: Apps fixed with proper branding and styling

## ✅ Web Applications (Next.js)

All web applications are running with full Flaresmith branding and styling:

| App | URL | Port | Status | Features |
|-----|-----|------|--------|----------|
| Main Web App | http://localhost:3000 | 3000 | ✅ Running | Full dashboard, design sync, theme toggle |
| User Web App | http://localhost:3001 | 3001 | ✅ Running | Dashboard cards, projects, environments, billing |
| Admin Web App | http://localhost:3002/admin | 3002 | ✅ Running | Admin portal, user management, settings |

## ✅ Mobile Applications (Expo)

Expo Metro bundlers are running and ready to launch:

| App | Metro URL | Web Port | How to Open Web |
|-----|-----------|----------|-----------------|
| User Mobile | http://localhost:8081 | TBD | Press `w` in terminal |
| Admin Mobile | http://localhost:8082 | TBD | Press `w` in terminal |

**Note:** To open the web version of mobile apps:
1. Find the terminal running the Expo app
2. Press `w` to launch in browser
3. The app will open in your default browser

## ⚠️ API (Not Running)

To start the API:
```bash
pnpm --filter @flaresmith/api dev
```

## Recent Fixes Applied

### 1. Branding Update (Latest)
**Issue:** Apps showed "CloudMake" instead of "Flaresmith"
**Fix:**
- Updated all branding from CloudMake → Flaresmith
- Updated main web app homepage with navigation buttons
- Improved user-web with dashboard cards (Projects, Environments, Billing)
- Improved admin-web with admin portal cards (Users, Settings, Analytics)
- All apps now show correct "Flaresmith" branding

### 2. Styling & Content (Latest)
**Issue:** User and admin apps were placeholder pages with no styling
**Fix:**
- Added Tailwind CSS configuration to both apps
- Created `globals.css` files with proper styling
- Replaced placeholder text with real dashboard layouts
- Added card-based navigation with hover effects
- Proper responsive grid layouts (mobile → desktop)

### 3. PostHog Analytics Error
**Issue:** PostHog Provider was causing 500 errors in Next.js apps
**Fix:** 
- Added proper error handling and try-catch blocks
- Made PostHog initialization more resilient
- Added safety checks for `document` object in SSR context

### 4. Environment Variables
**Created:** `.env.local` files for all web apps with:
- PostHog API key and host configuration
- API URL configuration
- Environment type (dev/staging/prod)

**Files created:**
- `apps/web/.env.local`
- `apps/admin-web/.env.local`
- `apps/user-web/.env.local`

### 5. Port Configuration
All apps automatically assigned to different ports to avoid conflicts:
- Web apps: 3000, 3001, 3002
- Mobile apps: 8081, 8082

## Quick Commands

### Start All Apps
```bash
# Web apps
pnpm --filter @flaresmith/web dev &
pnpm --filter @flaresmith/user-web dev &
pnpm --filter @flaresmith/admin-web dev &

# Mobile apps
cd apps/user-mobile && pnpm start --web &
cd apps/admin-mobile && pnpm start --web &
```

### Stop All Apps
```bash
pkill -f "next dev"
pkill -f "expo start"
```

### Check Running Ports
```bash
lsof -i :3000,3001,3002,8081,8082
```

## Known Warnings

### Expo Version Compatibility
The mobile apps show version compatibility warnings but still run correctly:
- React version mismatch (18.3.1 vs 18.2.0)
- React Native version mismatch (0.74.0 vs 0.74.5)
- TypeScript version mismatch (5.9.3 vs 5.3.3)

These are minor version differences and don't prevent the apps from running.

## Directory Structure

```
apps/
├── web/              # Main web app (Next.js)
├── user-web/         # User-facing web app (Next.js)
├── admin-web/        # Admin web app (Next.js)
├── user-mobile/      # User mobile app (Expo)
└── admin-mobile/     # Admin mobile app (Expo)
```

## Environment Variables

All web apps use these environment variables (configured in `.env.local`):

```env
NEXT_PUBLIC_POSTHOG_API_KEY=phc_qY5GP358V2XPYsQb0rFo3kizcOAS9ALbUhjM1EY5qfo
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_ENVIRONMENT=dev
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## Troubleshooting

### Web App Shows 500 Error
1. Check if `.env.local` exists in the app directory
2. Verify PostHog configuration
3. Check browser console for specific errors

### Port Already in Use
Next.js automatically tries the next available port. If you see warnings like "Port 3000 is in use, trying 3001 instead", this is normal.

### Expo App Won't Open Web
1. Ensure the Metro bundler is running
2. Press `w` in the correct terminal window
3. Check if the web port is available
4. Try refreshing the browser

### Hot Reload Not Working
1. Restart the dev server
2. Clear browser cache
3. Check if file watcher is working: `lsof | grep node`
