#!/usr/bin/env node

const { performance } = require('perf_hooks')

async function runBenchmarks() {
  console.log('\n=== Performance Benchmarks ===\n')

  console.log('Benchmark: Qualys getVulns (mock)')
  const start1 = performance.now()
  for (let i = 0; i < 10; i++) {
    await fetch('http://localhost:3100/api/qualys/vulns')
  }
  const time1 = (performance.now() - start1) / 10
  console.log(`  Average latency: ${time1.toFixed(2)}ms`)

  console.log('\nBenchmark: SentinelOne getThreats (mock)')
  const start2 = performance.now()
  for (let i = 0; i < 10; i++) {
    await fetch('http://localhost:3100/api/sentinelone/threats')
  }
  const time2 = (performance.now() - start2) / 10
  console.log(`  Average latency: ${time2.toFixed(2)}ms`)

  console.log('\n✓ Benchmarks complete')
}

runBenchmarks().catch(console.error)