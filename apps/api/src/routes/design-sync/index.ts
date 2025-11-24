// T023: Route registration barrel for design-sync feature
// Placeholder - actual route handlers (sync, drift, undo, coverage, credentials, browser sessions) will be added in US1/US2/US4/US5 phases.
import { Hono } from 'hono';
import { designSyncAccess } from '../../middleware/designSyncAccess';
import { correlationDesignSync } from '../../middleware/correlationDesignSync';
import { registerSyncRoutes } from './sync';
import { registerDriftRoutes } from './drift';
import { registerUndoRoutes } from './undo';
import { registerCoverageRoutes } from './coverage';
import { registerPreferencesRoutes } from './preferences';

const designSyncRouter = new Hono();

// Apply middleware
designSyncRouter.use('*', correlationDesignSync);
designSyncRouter.use('*', designSyncAccess);

// Placeholder health endpoint for feature readiness
designSyncRouter.get('/health', (c) => c.json({ feature: 'design-sync', status: 'ok' }));

// Register implemented routes
registerSyncRoutes(designSyncRouter);
registerDriftRoutes(designSyncRouter);
registerUndoRoutes(designSyncRouter);
registerCoverageRoutes(designSyncRouter);
registerPreferencesRoutes(designSyncRouter);

export default designSyncRouter;
/**
 * T023: Route registration barrel for design-sync feature
 * Will re-export individual route handlers (sync, drift, undo, coverage, credentials, browser session) once implemented.
 */
export {};
