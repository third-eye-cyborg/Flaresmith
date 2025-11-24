import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CloudflareStatusService } from '../../src/integrations/cloudflare/statusService';

// Helper to build fetch Response-like object
function buildResponse(status: number, json: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  } as Response;
}

describe('CloudflareStatusService.getPageDeploymentStatus', () => {
  const apiToken = 'test-token';
  const accountId = 'test-account';
  const projectName = 'pagesproj';
  const environment = 'dev';
  let service: CloudflareStatusService;

  beforeEach(() => {
    service = new CloudflareStatusService(apiToken, accountId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns deployed status when latest deployment success', async () => {
    const deployments = {
      result: [
        {
          id: 'dep-123',
          url: 'https://pagesproj.pages.dev',
          created_on: '2025-11-22T10:00:00Z',
          latest_stage: { status: 'success' },
          deployment_trigger: { metadata: { branch: environment } },
          environment,
        }
      ]
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(200, deployments));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('deployed');
    expect(status.deploymentId).toBe('dep-123');
    expect(status.url).toBe('https://pagesproj.pages.dev');
  });

  it('maps active stage to deploying', async () => {
    const deployments = {
      result: [
        {
          id: 'dep-456',
          url: 'https://pagesproj.pages.dev',
          created_on: '2025-11-22T10:00:00Z',
          latest_stage: { status: 'active' },
          deployment_trigger: { metadata: { branch: environment } },
          environment,
        }
      ]
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(200, deployments));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('deploying');
  });

  it('maps failure stage to failed', async () => {
    const deployments = {
      result: [
        {
          id: 'dep-789',
          url: 'https://pagesproj.pages.dev',
          created_on: '2025-11-22T10:00:00Z',
          latest_stage: { status: 'failure' },
          deployment_trigger: { metadata: { branch: environment } },
          environment,
        }
      ]
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(200, deployments));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('failed');
  });

  it('returns none when no deployments match environment', async () => {
    const deployments = { result: [] };
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(200, deployments));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('none');
  });

  it('returns none on 404', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(404, { result: null }));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('none');
  });

  it('returns error on non-404 failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(buildResponse(500, { errors: [{ message: 'Internal' }] }));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('error');
  });

  it('returns error on thrown exception', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const status = await service.getPageDeploymentStatus(projectName, environment);
    expect(status.status).toBe('error');
  });
});
