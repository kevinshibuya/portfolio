// Energy proxy for `battery-proxy`.
//
// Two sources, and the report always says which produced the numbers:
//
//   1. `sudo -n powermetrics` — real package/GPU watts. Kevin has decided to
//      grant passwordless sudo for it; whether the grant is actually in place
//      is probed at runtime, never assumed.
//   2. Cumulative renderer + GPU-process CPU time via CDP
//      `SystemInfo.getProcessInfo` — always collected, grant or no grant.
//
// (2) is not merely a fallback: it is recorded on EVERY battery-proxy run, so
// the baseline has one continuous energy series across the moment the sudo
// grant lands. If the powermetrics metrics only appeared later, every
// pre-grant baseline row would be uncomparable — the harness would have
// silently changed what it measures mid-campaign.

import { run, spawnDetached, killGroup, sleep } from './proc.mjs'

/**
 * Probe the actual grant, not `sudo -n true`: a sudoers entry can allow one
 * command and not another, and a harness that assumes otherwise reports
 * confident wrong numbers.
 */
export async function powermetricsAvailable() {
  const result = await run('sudo', ['-n', 'powermetrics', '--samplers', 'cpu_power', '-i', '200', '-n', '1'], {
    timeout: 15_000,
  })
  if (result.code === 0 && /Power:/i.test(result.stdout)) return { available: true, reason: 'sudo -n powermetrics ok' }
  const reason = /password is required/i.test(result.stderr)
    ? 'passwordless sudo for powermetrics is not granted on this rig'
    : (result.stderr || result.stdout || 'unknown').trim().split('\n')[0]
  return { available: false, reason }
}

/**
 * Sample power for `durationMs`. Started BEFORE the measurement window and
 * stopped after it, so the samples cover the window rather than trailing it.
 */
export function startPowermetrics(durationMs, intervalMs = 1000) {
  const samples = Math.max(1, Math.ceil(durationMs / intervalMs) + 2)
  const child = spawnDetached('sudo', [
    '-n',
    'powermetrics',
    '--samplers',
    'cpu_power,gpu_power',
    '-i',
    String(intervalMs),
    '-n',
    String(samples),
  ])
  const chunks = []
  child.stdout?.on('data', (chunk) => chunks.push(String(chunk)))
  child.stderr?.on('data', (chunk) => chunks.push(String(chunk)))
  return {
    async stop() {
      killGroup(child, 'SIGTERM')
      await sleep(200)
      killGroup(child, 'SIGKILL')
      return parsePowermetrics(chunks.join(''))
    },
  }
}

/**
 * Apple Silicon `powermetrics` prints per-sample lines like
 *   CPU Power: 812 mW
 *   GPU Power: 1543 mW
 *   Combined Power (CPU + GPU + ANE): 2410 mW
 * Intel Macs print `Package Power` instead; both are handled, and whichever is
 * present becomes `packageMw` so the metric name is stable across rigs.
 */
export function parsePowermetrics(text) {
  const grab = (pattern) => {
    const values = []
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1])
      if (Number.isFinite(value)) values.push(value)
    }
    return values
  }
  const cpu = grab(/^CPU Power:\s*([\d.]+)\s*mW/gim)
  const gpu = grab(/^GPU Power:\s*([\d.]+)\s*mW/gim)
  const combined = grab(/^Combined Power[^:]*:\s*([\d.]+)\s*mW/gim)
  const packageMw = grab(/^(?:Intel energy model derived )?package power:\s*([\d.]+)/gim)

  const average = (values) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length)
  const combinedAverage = average(combined) ?? average(packageMw)

  return {
    sampleCount: Math.max(cpu.length, gpu.length, combined.length, packageMw.length),
    cpuMw: average(cpu),
    gpuMw: average(gpu),
    packageMw: combinedAverage,
  }
}
