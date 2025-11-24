/**
 * MCP Performance Exporter Service (T111)
 *
 * Aggregates MCP server performance metrics (p95 latency, error rate, sequence/parallel latency)
 * from the `mcp_server_metrics` table and renders them in JSON or Prometheus exposition format.
 *
 * Success Criteria Alignment:
 *  - SC-021: MCP list operations performance tracking
 *  - SC-002: Propagation / availability times (latency metrics foundation)
 *
 * Data Source Schema (see db/schema/mcpServerMetrics.ts):
 *  id (uuid), serverName (varchar), date (date), p95LatencyMs (int), errorRatePct (numeric),
 *  seqLatencyMs (int), parallelLatencyMs (int), createdAt (timestamp)
 */

import { and, eq, gte } from 'drizzle-orm';
import { getDb } from '../../../db/connection';
import { mcpServerMetrics } from '../../../db/schema/mcpServerMetrics';

export interface MCPMetricsFilter {
  serverName?: string;
  days?: number; // lookback window (default 7)
}

export interface MCPMetricRecord {
  serverName: string;
  date: string; // YYYY-MM-DD
  p95LatencyMs: number;
  errorRatePct: number;
  seqLatencyMs?: number | null;
  parallelLatencyMs?: number | null;
}

export interface MCPMetricsSummary {
  servers: number;
  avgP95LatencyMs: number;
  avgErrorRatePct: number;
  maxP95LatencyMs: number;
  maxErrorRatePct: number;
}

export interface MCPMetricsExport {
  metrics: MCPMetricRecord[];
  summary: MCPMetricsSummary;
  meta: { count: number; generatedAt: string; windowDays: number };
}

export class PerformanceExporterService {
  constructor(private databaseUrl: string) {}

  /**
   * Fetch raw metric rows applying optional filters
   */
  async fetchMetrics(filter?: MCPMetricsFilter): Promise<MCPMetricRecord[]> {
    const db = getDb(this.databaseUrl);
    const days = filter?.days && filter.days > 0 ? filter.days : 7;
    const sinceDate = new Date(Date.now() - days * 86400000);
    // Build where clause
    let whereClause: any = gte(mcpServerMetrics.date, sinceDate.toISOString().slice(0, 10));
    if (filter?.serverName) {
      whereClause = and(whereClause, eq(mcpServerMetrics.serverName, filter.serverName));
    }
    const rows = await db.select().from(mcpServerMetrics).where(whereClause);
    return rows.map((r: typeof mcpServerMetrics.$inferSelect) => ({
      serverName: r.serverName,
      date: typeof r.date === 'string' ? r.date : String(r.date),
      p95LatencyMs: r.p95LatencyMs,
      errorRatePct: Number(r.errorRatePct),
      seqLatencyMs: r.seqLatencyMs ?? null,
      parallelLatencyMs: r.parallelLatencyMs ?? null,
    }));
  }

  /**
   * Build summary statistics from metric records
   */
  buildSummary(records: MCPMetricRecord[]): MCPMetricsSummary {
    if (records.length === 0) {
      return { servers: 0, avgP95LatencyMs: 0, avgErrorRatePct: 0, maxP95LatencyMs: 0, maxErrorRatePct: 0 };
    }
    const byServer = new Map<string, MCPMetricRecord[]>();
    for (const r of records) {
      if (!byServer.has(r.serverName)) byServer.set(r.serverName, []);
      byServer.get(r.serverName)!.push(r);
    }
    const allP95 = records.map(r => r.p95LatencyMs);
    const allErr = records.map(r => r.errorRatePct);
    const avgP95 = allP95.reduce((a, b) => a + b, 0) / allP95.length;
    const avgErr = allErr.reduce((a, b) => a + b, 0) / allErr.length;
    return {
      servers: byServer.size,
      avgP95LatencyMs: Math.round(avgP95),
      avgErrorRatePct: Number(avgErr.toFixed(2)),
      maxP95LatencyMs: Math.max(...allP95),
      maxErrorRatePct: Math.max(...allErr),
    };
  }

  /**
   * Export metrics as structured JSON
   */
  async exportJSON(filter?: MCPMetricsFilter): Promise<MCPMetricsExport> {
    const records = await this.fetchMetrics(filter);
    const summary = this.buildSummary(records);
    const days = filter?.days && filter.days > 0 ? filter.days : 7;
    return {
      metrics: records,
      summary,
      meta: { count: records.length, generatedAt: new Date().toISOString(), windowDays: days },
    };
  }

  /**
   * Export metrics in Prometheus exposition format.
   * We surface latest record per server for key gauges.
   */
  async exportPrometheus(filter?: MCPMetricsFilter): Promise<string> {
    const records = await this.fetchMetrics(filter);
    // Latest record per server (by date then createdAt)
    const latestByServer = new Map<string, MCPMetricRecord>();
    for (const r of records) {
      const existing = latestByServer.get(r.serverName);
      if (!existing || existing.date < r.date) {
        latestByServer.set(r.serverName, r);
      }
    }
    const lines: string[] = [];
    lines.push('# HELP mcp_server_p95_latency_ms 95th percentile latency per MCP server (latest record)');
    lines.push('# TYPE mcp_server_p95_latency_ms gauge');
    for (const [server, rec] of latestByServer) {
      lines.push(`mcp_server_p95_latency_ms{server="${server}"} ${rec.p95LatencyMs}`);
    }
    lines.push('# HELP mcp_server_error_rate_pct Error rate percentage per MCP server (latest record)');
    lines.push('# TYPE mcp_server_error_rate_pct gauge');
    for (const [server, rec] of latestByServer) {
      lines.push(`mcp_server_error_rate_pct{server="${server}"} ${rec.errorRatePct}`);
    }
    lines.push('# HELP mcp_server_seq_latency_ms Sequential operation latency per MCP server (latest record)');
    lines.push('# TYPE mcp_server_seq_latency_ms gauge');
    for (const [server, rec] of latestByServer) {
      if (rec.seqLatencyMs != null) {
        lines.push(`mcp_server_seq_latency_ms{server="${server}"} ${rec.seqLatencyMs}`);
      }
    }
    lines.push('# HELP mcp_server_parallel_latency_ms Parallel operation latency per MCP server (latest record)');
    lines.push('# TYPE mcp_server_parallel_latency_ms gauge');
    for (const [server, rec] of latestByServer) {
      if (rec.parallelLatencyMs != null) {
        lines.push(`mcp_server_parallel_latency_ms{server="${server}"} ${rec.parallelLatencyMs}`);
      }
    }
    const summary = this.buildSummary(Array.from(latestByServer.values()));
    lines.push('# HELP mcp_servers_count Number of MCP servers with metrics');
    lines.push('# TYPE mcp_servers_count gauge');
    lines.push(`mcp_servers_count ${summary.servers}`);
    lines.push('# HELP mcp_servers_avg_p95_latency_ms Average p95 latency across all servers');
    lines.push('# TYPE mcp_servers_avg_p95_latency_ms gauge');
    lines.push(`mcp_servers_avg_p95_latency_ms ${summary.avgP95LatencyMs}`);
    lines.push('# HELP mcp_servers_avg_error_rate_pct Average error rate pct across all servers');
    lines.push('# TYPE mcp_servers_avg_error_rate_pct gauge');
    lines.push(`mcp_servers_avg_error_rate_pct ${summary.avgErrorRatePct}`);
    return lines.join('\n');
  }
}

export function createPerformanceExporter(databaseUrl: string) {
  return new PerformanceExporterService(databaseUrl);
}

export const performanceExporterFactory = (databaseUrl?: string) => {
  return databaseUrl ? new PerformanceExporterService(databaseUrl) : null;
};
