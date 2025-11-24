# T099: Agent-Copilot Context Update

## Design Sync & Integration Hub - Agent Usage Patterns

### Core Concepts
- **Feature Namespace**: All operations under `/design-sync` route prefix
- **Correlation**: Every operation accepts optional `correlationId` for distributed tracing
- **Idempotency**: Sync operations use deterministic keys (`projectId-environmentId-timestamp`)
- **Metrics**: All services record performance metrics via `designSyncMetrics` singleton
- **Observability**: Structured logging with breadcrumbs for operation flow tracking

### Service Layers
1. **Services**: Business logic (sync, drift, coverage, browser, credential, notification)
2. **Routes**: HTTP endpoints with Zod validation
3. **Jobs**: Background tasks (digest generation, pruning)
4. **Utilities**: Retry logic, embedding generation (RAG)
5. **Metrics**: Performance tracking and aggregation

### Agent Decision Flow Examples

#### 1. Component Sync Workflow
```text
IF goal == "sync design components" THEN
  1. Validate credentials via GET /design-sync/credentials
  2. POST /design-sync/sync with projectId + environmentId + components
  3. GET /design-sync/drift to detect changes
  4. GET /design-sync/coverage to analyze sync impact
  5. POST /design-sync/browser-sessions to run browser tests
  6. Monitor via correlation ID across all operations
ENDIF
```

#### 2. Notification Configuration
```text
IF goal == "configure user notifications" THEN
  1. GET /design-sync/preferences/:userId to check current settings
  2. PUT /design-sync/preferences/:userId with updated categoryPreferences
  3. Test digest generation via designSyncDigestJob.generateDailyDigest()
  4. Verify Slack dispatch via notificationCategoryService.dispatchDigest()
ENDIF
```

#### 3. Credential Lifecycle
```text
IF goal == "manage provider credentials" THEN
  1. GET /design-sync/credentials?providers=github,slack,cloudflare
  2. POST /design-sync/credentials/actions with action='validate'
  3. IF expiring_soon THEN POST with action='rotate'
  4. IF compromised THEN POST with action='revoke'
  5. Monitor rotation status via credential.rotationDue field
ENDIF
```

#### 4. Browser Test Execution
```text
IF goal == "run browser test for story" THEN
  1. POST /design-sync/browser-sessions with storyId + correlationId
  2. Poll GET /design-sync/browser-sessions/:id until status != 'running'
  3. IF status == 'passed' THEN extract performanceSummary (LCP, FID, CLS)
  4. ELSE IF status == 'failed' THEN retrieve logs via correlationId
  5. Link to component via browserTestService.linkToStory(sessionId, newStoryId)
ENDIF
```

### MCP Tool Integration Patterns

#### Sync Operation
```json
{
  "tool": "design-sync.execute",
  "parameters": {
    "projectId": "uuid",
    "environmentId": "dev|staging|prod",
    "components": ["button", "input"],
    "correlationId": "optional-uuid"
  },
  "returns": {
    "operationId": "uuid",
    "componentsSynced": 2,
    "durationMs": 1200,
    "correlationId": "uuid"
  }
}
```

#### Drift Detection
```json
{
  "tool": "design-sync.detect-drift",
  "parameters": {
    "componentIds": ["uuid1", "uuid2"],
    "correlationId": "optional-uuid"
  },
  "returns": {
    "total": 1,
    "items": [
      {
        "componentId": "uuid1",
        "changeTypes": ["modified"],
        "severity": "low"
      }
    ]
  }
}
```

#### Browser Session Management
```json
{
  "tool": "design-sync.start-browser-session",
  "parameters": {
    "storyId": "uuid",
    "correlationId": "optional-uuid"
  },
  "returns": {
    "sessionId": "uuid",
    "status": "running",
    "startTime": "ISO-8601"
  }
}
```

### Performance Metrics Queries

```typescript
// Get sync performance stats
const stats = designSyncMetrics.getSyncStats(60); // Last 60 min
// Returns: { total, success, failure, partial, avgDurationMs, p95DurationMs }

// Get drift detection stats
const drift = designSyncMetrics.getDriftStats(60);
// Returns: { total, totalDrifts, totalFalsePositives, falsePositiveRate, avgDurationMs }

// Get browser test stats
const browser = designSyncMetrics.getBrowserTestStats(60);
// Returns: { total, passed, failed, aborted, passRate, avgLcp, avgFid, avgCls }

// Get notification stats
const notif = designSyncMetrics.getNotificationStats(60);
// Returns: { total, sent, failed, retrying, successRate, byChannel }
```

### Error Handling Patterns

```typescript
// Standard error response envelope
{
  "error": "DESIGN_SYNC_OPERATION_FAILED",
  "message": "Component sync failed due to invalid credentials",
  "details": {
    "correlationId": "uuid",
    "operationId": "uuid",
    "provider": "github",
    "hint": "Validate credentials via /design-sync/credentials"
  },
  "timestamp": "ISO-8601"
}
```

### Correlation ID Propagation

All operations accept and return `correlationId`:
1. **Request**: Include `correlationId` in body/query
2. **Logging**: All logs tagged with correlationId
3. **Metrics**: Metrics include correlationId for filtering
4. **Response**: Echo correlationId back to caller
5. **Cross-Service**: Same correlationId across sync → drift → coverage → browser → notification

### Agent Safeguards

1. **Rate Limits**: Check metrics before dispatching bulk operations
2. **Circuit Breaker**: If notification failures > 10 in 60s, circuit opens (wait 30s before retry)
3. **Credential Validation**: Always validate credentials before provisioning operations
4. **Idempotency**: Use same correlationId for retry attempts to prevent duplicates
5. **Metrics Pruning**: In-memory metrics limited to 1000 per type (oldest pruned first)

### Common Agent Mistakes to Avoid

❌ Forgetting correlationId for multi-step workflows (breaks tracing)  
❌ Not checking credential status before sync operations  
❌ Polling browser sessions too frequently (use 3-5 second intervals)  
❌ Ignoring circuit breaker status (notifications will fail anyway)  
❌ Not recording metrics for custom operations (observability gaps)  
❌ Dispatching notifications without preference checks (user opt-out ignored)

### Future Enhancements (Placeholders Present)

- **RAG Diff Explanation**: `/design-sync/diff-explain` endpoint for OpenAI-powered drift explanations
- **A11y Audits**: Automated accessibility compliance checking integrated with sync workflow
- **E2E Testing**: Full workflow tests combining sync + drift + coverage + browser + notifications

**Status**: ✅ Agent context updated with comprehensive usage patterns, MCP tool schemas, and safeguards.
