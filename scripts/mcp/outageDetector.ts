#!/usr/bin/env ts-node
/**
 * T047: Outage detection script
 * Wrapper naming aligned with tasks.md (distinct from detectOutages.ts legacy).
 */
import fs from 'fs';

interface ProbeResult { server: string; ok: boolean; durationMs: number }

const SERVERS = ["github","cloudflare","neon","postman","design-system","posthog"];

async function probe(server: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    await new Promise(r => setTimeout(r, 25)); // placeholder
    return { server, ok: true, durationMs: Date.now() - start };
  } catch {
    return { server, ok: false, durationMs: Date.now() - start };
  }
}

async function run() {
  const results: ProbeResult[] = [];
  for (const s of SERVERS) results.push(await probe(s));
  const outages = results.filter(r => !r.ok);
  const summary = { timestamp: new Date().toISOString(), outages: outages.map(o=>o.server), results };
  fs.writeFileSync('outage-report.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (outages.length) process.exitCode = 2;
}

run();
