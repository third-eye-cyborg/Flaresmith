import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PostmanWorkspaceService } from '../../src/integrations/postman/workspaceService';

/**
 * T175 / FR-029: Postman Hybrid Collection Structure Validation
 * Verifies provisioning pattern: Base collection + environment-specific collections (dev/staging/prod)
 * using naming conventions:
 *   Flaresmith Base - <ProjectName>
 *   Flaresmith - <ProjectName> (dev|staging|prod)
 * Network calls are mocked; we only validate naming logic and sequence of API invocations.
 */

describe('Postman hybrid collections (T175 / FR-029)', () => {
  const projectName = 'DemoProj';
  const apiKey = 'POSTMAN_TEST_KEY';
  let service: PostmanWorkspaceService;
  const fetchMock = vi.fn();

  beforeAll(() => {
    // Global fetch mock simulating required Postman endpoints
    // Sequence of calls:
    // 1: GET /workspaces (empty)
    // 2: POST /workspaces (create workspace)
    // 3+: POST /collections + PUT /workspaces/{id}/collections (4 collections)
    // Additional environment creation calls omitted here - focus on collections naming
    global.fetch = fetchMock as any;
    fetchMock.mockImplementation((url: string, init: any) => {
      const method = init?.method || 'GET';
      if (url.includes('/workspaces') && method === 'GET') {
        return mockResponse({ workspaces: [] });
      }
      if (url.includes('/workspaces') && method === 'POST') {
        return mockResponse({ workspace: { id: 'ws-123', name: `Flaresmith - ${projectName}` } });
      }
      if (url.includes('/collections') && method === 'POST') {
        const body = JSON.parse(init.body);
        return mockResponse({ collection: { id: `col-${body.collection.info.name}`, uid: `uid-${body.collection.info.name}`, info: { name: body.collection.info.name } } });
      }
      if (/\/workspaces\/ws-123\/collections$/.test(url) && method === 'PUT') {
        return mockResponse({ success: true });
      }
      return mockResponse({});
    });
    service = new PostmanWorkspaceService(apiKey);
  });

  function mockResponse(json: any) {
    return {
      ok: true,
      json: async () => json,
      status: 200,
      statusText: 'OK'
    } as Response;
  }

  it('creates base + environment collections with expected naming', async () => {
    const workspace = await service.createWorkspace({ name: `Flaresmith - ${projectName}`, description: 'Test workspace' });
    expect(workspace.workspaceId).toBe('ws-123');

    const baseName = `Flaresmith Base - ${projectName}`;
    const devName = `Flaresmith - ${projectName} (dev)`;
    const stagingName = `Flaresmith - ${projectName} (staging)`;
    const prodName = `Flaresmith - ${projectName} (prod)`;

    const created: string[] = [];
    for (const name of [baseName, devName, stagingName, prodName]) {
      const col = await service.createCollection({ workspaceId: workspace.workspaceId, name, description: 'test' });
      created.push(col.name);
    }

    expect(created).toEqual([baseName, devName, stagingName, prodName]);
    // Validate fetch call count heuristic: 1 list + 1 create workspace + (4 collections * 2 calls each) = 10
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(10);
  });
});
