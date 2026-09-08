// Process / shell helpers. Node stdlib only.

import { execFile, execFileSync, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Run a command and return { code, stdout, stderr } — never throws on a
 * non-zero exit. Perf plumbing routinely asks questions whose answer is "no"
 * (is sudo granted? is anything on 4173?), and those are answers, not faults.
 */
export async function run(cmd, args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    })
    return { code: 0, stdout, stderr }
  } catch (error) {
    return {
      code: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? String(error.message ?? error),
    }
  }
}

/** Synchronous one-liner for cheap rig facts. Returns '' on failure. */
export function runSync(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

/**
 * Snapshot of every process: pid, ppid, cumulative CPU time (seconds) and the
 * full command line. One `ps` call answers both "who is listening on 4173 and
 * who spawned them" and "how much CPU has the GPU process burned".
 */
export async function psTable() {
  const { stdout } = await run('ps', ['-Ao', 'pid=,ppid=,pcpu=,time=,command='])
  const rows = []
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\S+)\s+(.*)$/)
    if (!m) continue
    rows.push({
      pid: Number(m[1]),
      ppid: Number(m[2]),
      // Percent of ONE core, as macOS reports it — can exceed 100 on a
      // multi-threaded process. Used by the load guard (perf/lib/load.mjs).
      cpu: Number(m[3]),
      cpuSeconds: parseCpuTime(m[4]),
      command: m[5],
    })
  }
  return rows
}

/** macOS `ps -o time` formats: "MM:SS.ss", "HH:MM:SS", "D-HH:MM:SS". */
export function parseCpuTime(raw) {
  if (!raw) return 0
  let rest = raw
  let days = 0
  const dash = rest.indexOf('-')
  if (dash !== -1) {
    days = Number(rest.slice(0, dash)) || 0
    rest = rest.slice(dash + 1)
  }
  const parts = rest.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  let seconds = 0
  for (const part of parts) seconds = seconds * 60 + part
  return days * 86400 + seconds
}

/**
 * PIDs currently LISTENING on a TCP port.
 *
 * `-sTCP:LISTEN` is load-bearing: without it `lsof` also returns every process
 * merely CONNECTED to the port, which on this repo meant a headless Chrome
 * utility process showed up as a "stale listener" and would have been killed.
 */
export async function listenersOn(port) {
  const { stdout } = await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])
  return [...new Set(stdout.split('\n').map((s) => s.trim()).filter(Boolean).map(Number))].filter(
    (pid) => Number.isInteger(pid) && pid > 1,
  )
}

/** Our own process and every ancestor — never kill these. */
export async function selfAncestry() {
  const rows = await psTable()
  const byPid = new Map(rows.map((row) => [row.pid, row]))
  const chain = new Set()
  let pid = process.pid
  while (pid > 1 && !chain.has(pid)) {
    chain.add(pid)
    pid = byPid.get(pid)?.ppid ?? 0
  }
  return chain
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Never killable, at any round. An interactive or login shell is somebody's
 * terminal session, and a dev server started from one has that shell as an
 * ancestor — so generational escalation walks straight into it.
 */
const SHELL_PATTERN = /(^|\/)(-?(zsh|bash|sh|fish|ksh|tcsh|csh)|login|tmux[^/]*|screen)(\s|$)/i

/**
 * Commands the ESCALATION rounds (2 and 3) are allowed to target. Round 1 kills
 * whatever is actually listening; rounds 2+ climb the process tree, where a
 * blanket kill is dangerous, so they only fire on things that are recognisably
 * a dev-server supervisor.
 */
const SUPERVISOR_PATTERN = /(vite|wrangler|workerd|miniflare|npm|npx|pnpm|yarn|serve|http-server|node .*(preview|serve))/i

const describes = (command) => (command ?? '').slice(0, 110)

/**
 * Free a port, escalating one generation per round.
 *
 * Round 1 kills the listeners themselves. That is not always enough on this
 * repo: the e2e `webServer` runs `wrangler dev`, whose supervisor RESPAWNS a
 * fresh `workerd` listener within a second of the old one dying — observed
 * live while building this runner (a stale wrangler from a previous e2e run
 * was holding 4173 and answering nothing). So round 2 also kills each
 * listener's parent, round 3 the grandparent.
 *
 * THREE GUARDS, because escalation is the dangerous part. If another terminal
 * happens to be running `npm run dev -- --port 4173`, its tree is
 * `zsh -> npm -> node vite`, and an unguarded round 3 would SIGKILL that zsh
 * and everything else in that terminal:
 *
 *   1. our own process ancestry is never a target;
 *   2. no shell/login/tmux process is ever a target, at any round;
 *   3. rounds 2+ only target recognisable server supervisors.
 *
 * SIGTERM first, SIGKILL only if the thing is still alive — a supervisor given
 * the chance to shut down cleanly releases the port without orphaning children.
 */
export async function freePort(port, log) {
  for (let round = 1; round <= 3; round += 1) {
    const listeners = await listenersOn(port)
    if (listeners.length === 0) return

    const protectedPids = await selfAncestry()
    const rows = await psTable()
    const byPid = new Map(rows.map((row) => [row.pid, row]))

    const targets = new Set()
    for (const pid of listeners) {
      let current = pid
      for (let generation = 0; generation < round; generation += 1) {
        const command = byPid.get(current)?.command ?? ''
        const escalated = generation > 0
        const allowed =
          current > 1 &&
          !protectedPids.has(current) &&
          !SHELL_PATTERN.test(command) &&
          (!escalated || SUPERVISOR_PATTERN.test(command))
        if (allowed) targets.add(current)
        else if (current > 1 && escalated && command) {
          log(`  not escalating to ${current} (${describes(command)}) — not a recognised server supervisor`)
        }
        current = byPid.get(current)?.ppid ?? 0
        if (current <= 1) break
      }
    }

    for (const pid of targets) {
      const command = byPid.get(pid)?.command ?? '?'
      log(`  freeing :${port} — SIGTERM ${pid} (${describes(command)})`)
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        continue // Already gone between the ps snapshot and here.
      }
    }
    await sleep(600)
    for (const pid of targets) {
      try {
        process.kill(pid, 0) // Probe: throws if the process is gone.
        log(`  freeing :${port} — SIGKILL ${pid} (ignored SIGTERM)`)
        process.kill(pid, 'SIGKILL')
      } catch {
        // Exited on SIGTERM, which is the good path.
      }
    }
    await sleep(400)
  }

  const remaining = await listenersOn(port)
  if (remaining.length > 0) {
    throw new Error(
      `port ${port} is still held by ${remaining.join(', ')} after three escalating kill rounds — ` +
        `free it by hand before running the perf harness (a run against someone else's server is a corrupt baseline)`,
    )
  }
}

/** Spawn detached so the whole process group can be killed as one. */
export function spawnDetached(cmd, args, options = {}) {
  return spawn(cmd, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...options })
}

/** Kill a detached child's entire process group. */
export function killGroup(child, signal = 'SIGTERM') {
  if (!child || child.exitCode !== null || child.pid === undefined) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // Already dead.
    }
  }
}

export { sleep }
