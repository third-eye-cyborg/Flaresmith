# PostHog Analytics Integration - Setup Guide

## ✅ Implementation Complete

PostHog analytics has been successfully integrated across all Flaresmith platforms (web, mobile, API). This guide covers setup and testing.

---

## 📦 What's Been Installed

### Dependencies
- **Web**: `posthog-js@1.297.2`
- **Mobile**: `posthog-react-native`, `expo-constants`, `expo-file-system`, `expo-application`, `expo-device`, `expo-localization`
- **API**: `posthog-node`

### MCP Integration
- **Server**: `@posthog/mcp-server-posthog` (official)
- **Tools**: 9 MCP tools for organization/project management, events, feature flags, insights, dashboards
- **Config**: `mcp/config.json`

---

## 🔧 Environment Variable Setup

### 1. Get PostHog API Key

Your PostHog API key is stored in **GitHub repository secrets**. To use it locally:

```bash
# Option A: Use GitHub CLI to fetch secret
gh secret list
gh secret get POSTHOG_API_KEY

# Option B: Get from PostHog dashboard
# Navigate to: PostHog Dashboard → Project Settings → API Keys
```

### 2. Create Local Environment Files

#### Web App (.env.local)
```bash
# apps/web/.env.local
NEXT_PUBLIC_POSTHOG_API_KEY=phc_your_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_ENVIRONMENT=dev
```

#### Mobile App (Root .env)
```bash
# Root .env file (used by Expo)
POSTHOG_API_KEY=phc_your_project_api_key_here
POSTHOG_HOST=https://app.posthog.com
ENVIRONMENT=dev
```

#### API Backend (Cloudflare Workers)

For local development with Wrangler:
```bash
# apps/api/.dev.vars
POSTHOG_API_KEY=phc_your_project_api_key_here
POSTHOG_HOST=https://app.posthog.com
ENVIRONMENT=dev
```

For production deployment:
```bash
# Set Cloudflare Workers secrets
pnpm wrangler secret put POSTHOG_API_KEY --env production
pnpm wrangler secret put POSTHOG_HOST --env production
pnpm wrangler secret put ENVIRONMENT --env production
```

---

## 📁 Files Created/Modified

### Type Schemas
- `packages/types/src/analytics/events.ts` - 24 Zod event schemas
- `packages/types/src/analytics/common.ts` - Analytics type definitions
- `packages/types/src/mcp/posthog.ts` - MCP tool I/O schemas

### Core Analytics Service
- `packages/utils/src/analytics.ts` - Multi-platform PostHog client
- `packages/utils/src/analytics-helpers.ts` - Type-safe event helpers

### Web Integration
- `apps/web/src/components/PostHogProvider.tsx` - Provider with auto page-view tracking
- `apps/web/src/hooks/useAnalytics.ts` - React hook for components
- `apps/web/app/providers.tsx` - Integrated into root providers

### Mobile Integration
- `apps/mobile/src/contexts/AnalyticsProvider.tsx` - Expo provider
- `apps/mobile/src/hooks/useAnalytics.ts` - React Native hook
- `apps/mobile/app/_layout.tsx` - Integrated into root layout
- `apps/mobile/app.json` - Environment variable configuration

### API Integration
- `apps/api/src/middleware/analytics.ts` - Hono middleware
- `apps/api/src/app.ts` - Added to middleware pipeline

### Configuration
- `mcp/config.json` - PostHog MCP server
- `.env.example` - Updated with PostHog variables

---

## 🎯 Usage Examples

### Web App (Next.js)

```typescript
'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export function ProjectCreationButton() {
  const { identify, trackProject } = useAnalytics();

  const handleCreate = async () => {
    // Identify user first
    identify('user-123', {
      email: 'user@example.com',
      plan: 'pro',
    });

    // Track project creation
    trackProject({
      userId: 'user-123',
      projectId: 'proj-456',
      projectName: 'My Project',
      integrations: ['github', 'cloudflare', 'neon'],
      provisioningDurationMs: 3500,
    });
  };

  return <button onClick={handleCreate}>Create Project</button>;
}
```

### Mobile App (Expo)

```typescript
import { useAnalytics } from '../src/hooks/useAnalytics';

export default function HomeScreen() {
  const { identify, trackChat } = useAnalytics();

  const startChatSession = () => {
    trackChat({
      userId: 'user-123',
      projectId: 'proj-456',
      sessionId: 'session-789',
    });
  };

  return <Button title="Start Chat" onPress={startChatSession} />;
}
```

### API Backend (Hono)

```typescript
import { trackProjectCreated } from '@flaresmith/utils';
import { getAnalyticsContext } from '../middleware/analytics';

app.post('/api/projects', async (c) => {
  const startTime = Date.now();
  const { userId, environment, platform } = getAnalyticsContext(c);

  // ... create project logic ...

  // Track event
  trackProjectCreated({
    userId,
    projectId: newProject.id,
    projectName: newProject.name,
    integrations: ['github', 'cloudflare'],
    provisioningDurationMs: Date.now() - startTime,
    environment,
    platform,
  });

  return c.json({ project: newProject });
});
```

---

## 🧪 Testing the Integration

### 1. Start Development Servers

```bash
# From repo root
pnpm dev
```

This starts:
- Web app: http://localhost:3000
- Mobile app: Expo dev server
- API: http://localhost:8787

### 2. Verify Event Capture

#### Web App
1. Open http://localhost:3000
2. Navigate to different pages
3. **Expected events**:
   - `page_view` events for each navigation
   - Session recording should start

#### Mobile App
1. Open Expo Go or simulator
2. Navigate between screens
3. **Expected events**:
   - `page_view` events for screen navigation
   - Device properties captured

#### API
1. Make API requests:
   ```bash
   curl http://localhost:8787/health
   curl http://localhost:8787/api/projects
   ```
2. **Expected events**:
   - `api_request` events with method, path, status, duration
   - Error events if requests fail

### 3. Check PostHog Dashboard

1. Log in to https://app.posthog.com
2. Navigate to **Activity** → **Live Events**
3. You should see events streaming in real-time
4. Check **Persons** to see identified users
5. Check **Session Replay** for web recordings

### 4. Test Feature Flags

```typescript
const { isEnabled } = useAnalytics();

const newFeatureEnabled = await isEnabled('new-feature-flag');
if (newFeatureEnabled) {
  // Show new feature
}
```

Create a feature flag in PostHog dashboard and test the hook.

---

## 📊 Available Events

### Project Events
- `project_created` - New project provisioned
- `project_viewed` - User viewed project details
- `project_deleted` - Project removed

### Environment Events
- `environment_provisioned` - Environment created
- `environment_promoted` - Promoted between dev/staging/prod
- `deployment_rollback` - Rollback executed

### Specification Events
- `spec_applied` - Spec changes applied
- `spec_drift_detected` - Drift from spec detected

### Chat Events
- `chat_session_started` - Chat session initiated
- `chat_message_sent` - Message sent in chat
- `diff_applied` - Code diff applied

### Error & Performance
- `error_occurred` - Application error
- `performance_metric` - Performance measurement

### User Events
- `user_signed_up` - New user registration
- `user_signed_in` - User login
- `subscription_changed` - Plan change

### Integration Events
- `integration_connected` - External service connected
- `integration_error` - Integration failure

### Deployment Events
- `deployment_completed` - Deployment finished
- `build_completed` - Build process finished

### Analytics Events
- `page_view` - Page/screen navigation
- `api_request` - API endpoint called
- `feature_flag_evaluated` - Feature flag checked

---

## 🔐 Security Notes

1. **Never commit** API keys to source control
2. **Use GitHub secrets** for CI/CD
3. **Use Cloudflare secrets** for production API
4. **Use `.env.local`** for local development (gitignored)
5. **Limit API key scope** to minimum required permissions

---

## 🚀 Deployment Checklist

### Web (Vercel/Cloudflare Pages)
- [ ] Set `NEXT_PUBLIC_POSTHOG_API_KEY` environment variable
- [ ] Set `NEXT_PUBLIC_POSTHOG_HOST` environment variable
- [ ] Set `NEXT_PUBLIC_ENVIRONMENT=prod`

### Mobile (EAS Build)
- [ ] Configure `eas.json` with environment variables
- [ ] Set secrets via `eas secret:create`
- [ ] Update `app.json` extra config for production

### API (Cloudflare Workers)
- [ ] Run `wrangler secret put POSTHOG_API_KEY`
- [ ] Run `wrangler secret put POSTHOG_HOST`
- [ ] Run `wrangler secret put ENVIRONMENT`
- [ ] Deploy with `pnpm deploy`

---

## 🐛 Troubleshooting

### Events Not Appearing in PostHog

1. **Check API key is set**:
   ```bash
   # Web
   echo $NEXT_PUBLIC_POSTHOG_API_KEY
   
   # Mobile
   echo $POSTHOG_API_KEY
   ```

2. **Check browser console** (web):
   - Look for PostHog initialization message
   - Check Network tab for requests to PostHog

3. **Check logs** (API):
   - Look for "PostHog analytics initialized for API"
   - Check for error messages

4. **Verify environment**:
   - PostHog requires valid API key format: `phc_...`
   - Host should be `https://app.posthog.com` (or self-hosted URL)

### Type Errors

If you see TypeScript errors with analytics types:
```bash
# Rebuild types package
cd packages/types
pnpm typecheck

# Rebuild utils package
cd ../utils
pnpm typecheck
```

### MCP Tools Not Working

1. Check `mcp/config.json` has correct environment variables
2. Verify PostHog API key has admin permissions
3. Restart your editor/MCP server

---

## 📚 Additional Resources

- **PostHog Docs**: https://posthog.com/docs
- **PostHog MCP Server**: https://posthog.com/docs/model-context-protocol
- **Feature Flags Guide**: https://posthog.com/docs/feature-flags
- **Session Replay**: https://posthog.com/docs/session-replay
- **Event Tracking Best Practices**: https://posthog.com/docs/product-analytics/capture-events

---

## ✅ Next Steps

1. **Set environment variables** (see setup section above)
2. **Start development servers** (`pnpm dev`)
3. **Test event capture** (navigate apps, make API calls)
4. **Verify in PostHog dashboard** (check live events)
5. **Create feature flags** (test in your apps)
6. **Set up production environments** (deployment checklist)

**All code is ready to use!** Just add your PostHog API key and start tracking. 🎉
