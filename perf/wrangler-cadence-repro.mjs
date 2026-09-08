// BLOCKER 1 reproducer — `wrangler dev` dies mid-suite with "Network connection lost."
//
// Root cause (perf/decisions.md, 2026-08-24): wrangler's ProxyWorker forwards every
// request to the UserWorker workerd over a pooled keep-alive connection. kj's
// client pool keeps an idle connection for 5 s (HttpClientSettings.idleTimeout)
// and kj's server closes an idle keep-alive connection after 5 s
// (HttpServerSettings.pipelineTimeout). A request that reuses a pooled
// connection ~5.000 s after the previous response rides the server's close,
// the inner fetch rejects with kj DISCONNECTED ("Network connection lost."),
// and since wrangler 4.114.0 (#14593: origin comparison) that rejection is
// reported to the ProxyController and DevEnv.handleErrorEvent treats it as
// FATAL — the dev server exits with an empty `✘ [ERROR]`.
//
// This script proves it on the built `dist/` in ~15 s per interval: a GET on a
// steady send-time-aligned cadence, fresh inbound socket per shot so only the
// ProxyWorker → UserWorker hop can race. 5000 ms kills the server at shot 1;
// 4000 ms never does. It is the RED acceptance test for the fix: the fix is in
// when 5000 ms survives every shot.
//
//   node perf/wrangler-cadence-repro.mjs [intervalsCsv=5000,4000] [shots=6] [port=4199]
//
// Requires a fresh `npm run build` (serves dist/). Never run it while a
// Playwright or `npm run perf` run is up — one wrangler per machine.
import { spawn } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const intervals = (process.argv[2] ?? '5000,4000').split(',').map(Number)
const SHOTS = Number(process.argv[3] ?? 6)
const PORT = Number(process.argv[4] ?? 4199)
const cwd = fileURLToPath(new URL('..', import.meta.url))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function get() {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const req = http.request({ host: '127.0.0.1', port: PORT, path: '/', method: 'GET', agent: false }, (res) => {
      res.resume()
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - t0 }))
    })
    req.on('error', (e) => resolve({ err: e.code ?? e.message, ms: Date.now() - t0 }))
    req.end()
  })
}

async function waitReady(proc) {
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) return false
    if ((await get()).status === 200) return true
    await sleep(500)
  }
  return false
}

let anyFatal = false
for (const interval of intervals) {
  console.log(`\n=== interval ${interval} ms · ${SHOTS} shots · port ${PORT} ===`)
  const proc = spawn('npx', ['wrangler', 'dev', '--port', String(PORT)], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  proc.stdout.on('data', (d) => { output += d })
  proc.stderr.on('data', (d) => { output += d })
  let exited = null
  proc.on('exit', (code) => { exited = { code, at: Date.now() } })
  if (!(await waitReady(proc))) { console.log('server never became ready'); proc.kill('SIGTERM'); continue }
  await sleep(1500)

  let fails = 0
  const t0 = Date.now()
  for (let i = 0; i < SHOTS; i++) {
    const wait = t0 + i * interval - Date.now()
    if (wait > 0) await sleep(wait)
    const r = await get()
    const bad = Boolean(r.err) || r.status >= 500
    if (bad) fails++
    console.log(`shot ${String(i).padStart(2)} t=${((Date.now() - t0) / 1000).toFixed(3)}s ${r.err ?? r.status} (${r.ms} ms)${bad ? '  <-- FAIL' : ''}`)
    if (exited || r.err === 'ECONNREFUSED') { await sleep(300); break }
  }
  const fatal = exited !== null
  anyFatal ||= fatal
  console.log(`interval ${interval}: fails=${fails}, wrangler ${fatal ? `EXITED code=${exited.code}` : 'alive'}`)
  const errLines = output.split('\n').filter((l) => /ERROR|lost/i.test(l)).slice(0, 4)
  if (errLines.length) console.log('wrangler said: ' + errLines.join(' | '))
  if (!fatal) { proc.kill('SIGTERM'); await sleep(1500) }
  if (proc.exitCode === null) proc.kill('SIGKILL')
  await sleep(1000)
}
console.log(anyFatal ? '\nRESULT: wrangler dev died on at least one cadence (bug present)' : '\nRESULT: wrangler dev survived every cadence')
process.exit(anyFatal ? 1 : 0)
