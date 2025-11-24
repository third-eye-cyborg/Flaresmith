// T059: GET /design-sync/coverage route handler
// Feature: 006-design-sync-integration
// Returns coverage reports for components with variant completeness % and test gaps
// Spec References: FR-011, FR-012, SC-005, US2

import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/connection';
import { componentArtifacts, coverageReports } from '../../../db/schema/designSync';
import { eq, desc, inArray } from 'drizzle-orm';
import { computeCoverage, type ComponentCoverageInput, type VariantDescriptor, type StoryRecord } from '../../utils/designSync/coverageCalc';
import { designSyncLogger } from '../../logging/designSyncLogger';

const CoverageQuerySchema = z.object({
  componentIds: z.string().optional(), // Comma-separated UUIDs
  refresh: z.enum(['true', 'false']).optional(), // Force recalculation vs cached
});

export function registerCoverageRoutes(router: Hono) {
  router.get('/coverage', async (c) => {
    const startMs = Date.now();
    
    try {
      // Parse query parameters
      const query = CoverageQuerySchema.safeParse({
        componentIds: c.req.query('componentIds'),
        refresh: c.req.query('refresh'),
      });
      
      if (!query.success) {
        designSyncLogger.warn({ action: 'coverage.validation_failed', errors: query.error.errors });
        return c.json({ error: 'invalid_query', details: query.error.errors }, 400);
      }
      
      const { componentIds: componentIdsParam, refresh } = query.data;
      const shouldRefresh = refresh === 'true';
      
      // Determine target components
      let targetComponents;
      if (componentIdsParam) {
        const ids = componentIdsParam.split(',').filter(Boolean);
        targetComponents = await db.select().from(componentArtifacts).where(inArray(componentArtifacts.id, ids));
      } else {
        targetComponents = await db.select().from(componentArtifacts);
      }
      
      if (targetComponents.length === 0) {
        return c.json({ reports: [], overallVariantCoveragePct: 100, totalComponents: 0 });
      }
      
      // Attempt to load cached reports if not forcing refresh
      const reports: Array<{
        componentId: string;
        componentName: string;
        variantCoveragePct: number;
        missingVariants: string[];
        missingTests: Array<{ variantName: string; missingTestTypes: string[] }>;
        warnings: string[];
        generatedAt: string;
      }> = [];
      
      for (const component of targetComponents) {
        let report;
        
        if (!shouldRefresh) {
          // Try to fetch latest cached report
          const cached = await db.select()
            .from(coverageReports)
            .where(eq(coverageReports.componentId, component.id))
            .orderBy(desc(coverageReports.generatedAt))
            .limit(1);
          
          if (cached.length > 0) {
            const cr = cached[0];
            report = {
              componentId: cr.componentId,
              componentName: component.name,
              variantCoveragePct: parseFloat(cr.variantCoveragePct),
              missingVariants: cr.missingVariants as string[],
              missingTests: cr.missingTests as Array<{ variantName: string; missingTestTypes: string[] }>,
              warnings: (cr.warnings as string[]) || [],
              generatedAt: cr.generatedAt.toISOString(),
            };
          }
        }
        
        // If no cached report or refresh requested, compute fresh coverage
        if (!report) {
          // Placeholder: extract variants from component (jsonb field)
          const definedVariants: VariantDescriptor[] = Array.isArray(component.variants)
            ? (component.variants as unknown as VariantDescriptor[])
            : [];
          
          // Placeholder: fetch stories from external registry (simulated empty for now)
          // In real implementation, query Storybook registry or story_metadata table
          const existingStories: StoryRecord[] = [];
          
          const input: ComponentCoverageInput = {
            componentId: component.id,
            componentName: component.name,
            definedVariants,
            existingStories,
          };
          
          const coverage = computeCoverage(input);
          
          // Persist fresh report to coverage_reports table
          await db.insert(coverageReports).values({
            componentId: coverage.componentId,
            generatedAt: new Date(),
            variantCoveragePct: coverage.variantCoveragePct.toString(),
            missingVariants: coverage.missingVariants,
            missingTests: coverage.missingTests,
            warnings: coverage.warnings,
          });
          
          report = {
            componentId: coverage.componentId,
            componentName: component.name,
            variantCoveragePct: coverage.variantCoveragePct,
            missingVariants: coverage.missingVariants,
            missingTests: coverage.missingTests,
            warnings: coverage.warnings,
            generatedAt: new Date().toISOString(),
          };
        }
        
        reports.push(report);
      }
      
      // Calculate overall coverage (average across all components)
      const overallVariantCoveragePct = reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + r.variantCoveragePct, 0) / reports.length)
        : 100;
      
      const durationMs = Date.now() - startMs;
      designSyncLogger.info({
        action: 'coverage.get',
        totalComponents: reports.length,
        overallCoveragePct: overallVariantCoveragePct,
        refreshed: shouldRefresh,
        durationMs,
      });
      
      return c.json({
        reports,
        overallVariantCoveragePct,
        totalComponents: reports.length,
        durationMs,
      });
      
    } catch (err: unknown) {
      const durationMs = Date.now() - startMs;
      const message = err instanceof Error ? err.message : 'Unknown error';
      designSyncLogger.error({ action: 'coverage.error', message, durationMs });
      return c.json({ error: 'coverage_failed', message: 'Unable to generate coverage report.' }, 500);
    }
  });
}
