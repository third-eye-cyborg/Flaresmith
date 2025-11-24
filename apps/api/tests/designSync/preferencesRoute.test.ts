// T075: Preferences route unit tests
// Feature: 006-design-sync-integration
// Tests for GET/PUT notification preference operations with validation and RBAC

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { db } from '../../db/connection';
import { notificationPreferences } from '../../db/schema/designSync';
import { users } from '../../db/schema/base';
import { registerPreferencesRoutes } from '../../src/routes/design-sync/preferences';

type PreferencesResponse = {
  userId: string;
  projectId: string | null;
  categoryPreferences: Record<string, boolean>;
  digestEnabled: boolean;
  digestFrequency: string;
  digestTimeUtc: string;
};

type ErrorResponse = {
  error: string;
};

describe('Preferences Route - GET /preferences/:userId', () => {
  const app = new Hono();
  registerPreferencesRoutes(app);

  beforeEach(async () => {
    await db.delete(notificationPreferences);
  });

  it('should return default preferences if none exist', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    const res = await app.request(`/preferences/${userId}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userId).toBe(userId);
    expect(data.categoryPreferences).toBeDefined();
    expect(data.categoryPreferences.sync_completed).toBe(true);
    expect(data.digestEnabled).toBe(false);
    expect(data.digestFrequency).toBe('daily');
    expect(data.digestTimeUtc).toBe('09:00');
  });

  it('should return existing preferences', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    await db.insert(notificationPreferences).values({
      userId,
      digestEnabled: true,
      digestFrequency: 'weekly',
      digestTimeUtc: '14:00',
      categoryPreferences: {
        sync_completed: false,
        drift_detected: true,
      },
    });

    const res = await app.request(`/preferences/${userId}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.userId).toBe(userId);
    expect(data.digestEnabled).toBe(true);
    expect(data.digestFrequency).toBe('weekly');
    expect(data.digestTimeUtc).toBe('14:00');
    expect(data.categoryPreferences.sync_completed).toBe(false);
    expect(data.categoryPreferences.drift_detected).toBe(true);
  });

  it('should filter by projectId query parameter', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;
    const projectId = 'project-123';

    await db.insert(notificationPreferences).values({
      userId,
      projectId,
      digestEnabled: true,
      digestFrequency: 'daily',
      digestTimeUtc: '10:00',
      categoryPreferences: {},
    });

    const res = await app.request(`/preferences/${userId}?projectId=${projectId}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.projectId).toBe(projectId);
    expect(data.digestEnabled).toBe(true);
  });

  it('should handle database errors gracefully', async () => {
    const res = await app.request('/preferences/invalid-uuid', {
      method: 'GET',
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('internal_server_error');
  });
});

describe('Preferences Route - PUT /preferences/:userId', () => {
  const app = new Hono();
  registerPreferencesRoutes(app);

  beforeEach(async () => {
    await db.delete(notificationPreferences);
  });

  it('should create new preferences if none exist', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    const res = await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryPreferences: {
          sync_completed: false,
          drift_detected: true,
        },
        digestEnabled: true,
        digestFrequency: 'weekly',
        digestTimeUtc: '15:00',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.userId).toBe(userId);
    expect(data.digestEnabled).toBe(true);
    expect(data.digestFrequency).toBe('weekly');
    expect(data.digestTimeUtc).toBe('15:00');
    expect(data.categoryPreferences.sync_completed).toBe(false);
    expect(data.categoryPreferences.drift_detected).toBe(true);
  });

  it('should update existing preferences partially', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    await db.insert(notificationPreferences).values({
      userId,
      digestEnabled: false,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {
        sync_completed: true,
        drift_detected: true,
      },
    });

    const res = await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digestEnabled: true,
        // Other fields not included - should keep existing values
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.digestEnabled).toBe(true); // Updated
    expect(data.digestFrequency).toBe('daily'); // Preserved
    expect(data.digestTimeUtc).toBe('09:00'); // Preserved
  });

  it('should merge category preferences', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    await db.insert(notificationPreferences).values({
      userId,
      digestEnabled: false,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {
        sync_completed: true,
        drift_detected: false,
      },
    });

    const res = await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryPreferences: {
          drift_detected: true, // Updated
          coverage_summary: false, // New
        },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.categoryPreferences.sync_completed).toBe(true); // Preserved
    expect(data.categoryPreferences.drift_detected).toBe(true); // Updated
    expect(data.categoryPreferences.coverage_summary).toBe(false); // Added
  });

  it('should validate digest time format', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    const res = await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digestTimeUtc: 'invalid-time',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('invalid_payload');
  });

  it('should validate digest frequency enum', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    const res = await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digestFrequency: 'hourly', // Invalid value
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('invalid_payload');
  });

  it('should handle projectId scoping', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;
    const projectId = 'project-456';

    const res = await app.request(`/preferences/${userId}?projectId=${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digestEnabled: true,
        digestFrequency: 'daily',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.projectId).toBe(projectId);
    expect(data.digestEnabled).toBe(true);
  });

  it('should update updatedAt timestamp', async () => {
    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    const userId = testUser[0]?.id;

    await db.insert(notificationPreferences).values({
      userId,
      digestEnabled: false,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    const beforeUpdate = new Date();
    await new Promise((resolve) => setTimeout(resolve, 10));

    await app.request(`/preferences/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digestEnabled: true }),
    });

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where((t) => t.userId === userId)
      .limit(1);

    expect(prefs[0]?.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
  });
});
