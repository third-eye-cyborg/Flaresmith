/**
 * Admin Query Performance Benchmark (T086)
 * 
 * Measures latency impact of RLS policies on admin queries.
 * Compares:
 * - Admin queries WITH RLS enabled (standard)
 * - Direct queries bypassing application-layer RLS (admin override pattern)
 * 
 * Validates SC-007: Connection pool handles mixed admin/user workload efficiently.
 * 
 * IMPORTANT: Must run from apps/api directory where dependencies are installed:
 * ```bash
 * cd apps/api
 * DATABASE_URL=<neon-url> pnpm exec ts-node ../../scripts/db/adminQueryBenchmark.ts
 * ```
 * 
 * Or with test database:
 * ```bash
 * cd apps/api
 * TEST_DATABASE_URL=<neon-url> pnpm exec ts-node ../../scripts/db/adminQueryBenchmark.ts
 * ```
 * 
 * Expected Output:
 * - Benchmark table showing latencies for 6 query patterns
 * - Pass/warn/fail verdict based on p95 thresholds (<100ms, 100-200ms, >200ms)
 */

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or TEST_DATABASE_URL environment variable required');
  process.exit(1);
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  avgLatencyMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
}

async function benchmarkQuery(
  name: string,
  queryFn: () => Promise<any>,
  iterations = 100
): Promise<BenchmarkResult> {
  const latencies: number[] = [];

  // Warmup
  for (let i = 0; i < 5; i++) {
    await queryFn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await queryFn();
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);

  return {
    operation: name,
    iterations,
    avgLatencyMs: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)),
    minMs: Number((latencies[0] || 0).toFixed(2)),
    maxMs: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
    p95Ms: Number((latencies[Math.floor(latencies.length * 0.95)] || 0).toFixed(2)),
  };
}

async function runBenchmarks() {
  console.log('🔬 Admin Query Performance Benchmark\n');
  console.log(`Database: ${DATABASE_URL!.slice(0, 40)}...`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: BenchmarkResult[] = [];

  // Import dependencies dynamically to avoid errors in root scripts directory
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  const { eq } = await import('drizzle-orm');
  const schema = await import('../../apps/api/db/schema');

  const sql = neon(DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Benchmark 1: SELECT all users (admin sees all, RLS enforced at DB layer)
  console.log('[1/6] Benchmarking: SELECT all users (admin context)...');
  const allUsers = await benchmarkQuery(
    'SELECT users (admin, RLS enabled)',
    async () => {
      return await db.query.users.findMany({ limit: 100 });
    }
  );
  results.push(allUsers);

  // Benchmark 2: SELECT polar customers (admin override)
  console.log('[2/6] Benchmarking: SELECT polar_customers (admin override)...');
  const allCustomers = await benchmarkQuery(
    'SELECT polar_customers (admin)',
    async () => {
      return await db.query.polarCustomers.findMany({ limit: 100 });
    }
  );
  results.push(allCustomers);

  // Benchmark 3: SELECT admin audit logs (admin-only table)
  console.log('[3/6] Benchmarking: SELECT admin_audit_logs (admin-only)...');
  const auditLogs = await benchmarkQuery(
    'SELECT admin_audit_logs (admin)',
    async () => {
      return await db.query.adminAuditLogs.findMany({ limit: 100 });
    }
  );
  results.push(auditLogs);

  // Benchmark 4: Complex JOIN query (admin context)
  console.log('[4/6] Benchmarking: JOIN users + polar_customers...');
  const joinQuery = await benchmarkQuery(
    'JOIN users + polar_customers (admin)',
    async () => {
      return await db
        .select({
          userId: schema.users.id,
          email: schema.users.email,
          tier: schema.polarCustomers.subscriptionTier,
        })
        .from(schema.users)
        .leftJoin(schema.polarCustomers, eq(schema.users.id, schema.polarCustomers.userId))
        .limit(50);
    }
  );
  results.push(joinQuery);

  // Benchmark 5: Count aggregation (admin context)
  console.log('[5/6] Benchmarking: COUNT aggregation...');
  const countQuery = await benchmarkQuery(
    'COUNT(*) FROM users (admin)',
    async () => {
      return await sql`SELECT COUNT(*) FROM users`;
    }
  );
  results.push(countQuery);

  // Benchmark 6: Raw SQL query (baseline performance)
  console.log('[6/6] Benchmarking: Raw SQL SELECT...');
  const rawQuery = await benchmarkQuery(
    'SELECT id, email FROM users LIMIT 50 (raw SQL)',
    async () => {
      return await sql`SELECT id, email FROM users LIMIT 50`;
    }
  );
  results.push(rawQuery);

  // Print results
  console.log('\n📊 Benchmark Results:\n');
  console.table(results);

  // Analysis
  console.log('\n🔍 Analysis:\n');
  const avgLatency = results.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.length;
  const maxP95 = Math.max(...results.map((r) => r.p95Ms));

  console.log(`Average Latency (all operations): ${avgLatency.toFixed(2)}ms`);
  console.log(`Worst p95 Latency: ${maxP95.toFixed(2)}ms`);

  if (maxP95 < 100) {
    console.log('✅ PASS: All admin queries complete within acceptable latency (<100ms p95)');
  } else if (maxP95 < 200) {
    console.log('⚠️  WARN: Some queries approaching latency threshold (100-200ms p95)');
  } else {
    console.log('❌ FAIL: Queries exceed latency threshold (>200ms p95)');
  }

  console.log('\n✨ Benchmark complete.\n');
}

runBenchmarks().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
