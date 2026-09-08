// Page-side instrumentation, injected as a Playwright init script.
//
// HARD RULE (plan Boundaries): no app-code edits. Everything below installs
// itself from the runner side, before any page script runs, and everything it
// touches is either additive (a rAF loop, a PerformanceObserver) or one-shot
// and self-removing (the first-draw hook). The app cannot tell it is here.
//
// KNOWN INSTRUMENTATION EFFECT, recorded rather than hidden: the rAF ring
// buffer keeps a rAF callback registered for the page's whole life, so the
// browser produces animation frames even in moments the page would otherwise
// let go idle (e.g. after the Selected Work stage settles and the hero canvas
// has paused off-screen). Frame COUNT is therefore an instrumentation-floor
// number, not the app's own. Two consequences, both handled:
//   - frame-time percentiles remain meaningful (they describe the cadence the
//     compositor actually achieved), and
//   - GPU per-frame metrics divide by PRESENTED frames from the trace
//     (viz SwapBuffers), not by rAF ticks, so an empty rAF tick that produces
//     no damage and no swap cannot deflate them.

export const INIT_SCRIPT = String.raw`
(() => {
  if (window.__PERF__) return;
  var MAX_FRAMES = 200000;
  var P = {
    frames: [],
    longTasks: [],
    marks: Object.create(null),
    overflowed: false,
    errors: [],
    lastScrollAt: null,
    // GPU-execution timing, keyed by data-canvas. The "missing" list is not
    // cosmetic: a silent zero is indistinguishable from a free shader, so an
    // absent extension has to stay visible downstream.
    gpu: { samples: Object.create(null), disjoint: 0, hooked: [], missing: [] },
  };
  window.__PERF__ = P;

  // Scroll-settle signal for scroll-transition. A PASSIVE listener updating one
  // number lets the runner wait on an in-page predicate instead of polling
  // page.evaluate() over CDP ~30 times inside its own measurement window.
  window.addEventListener(
    'scroll',
    function () { P.lastScrollAt = performance.now(); },
    { passive: true },
  );

  // ── rAF ring buffer: the frame-time source ──────────────────────────────
  var loop = function (t) {
    if (P.frames.length < MAX_FRAMES) P.frames.push(t);
    else P.overflowed = true;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ── long tasks ──────────────────────────────────────────────────────────
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        P.longTasks.push({ start: entries[i].startTime, duration: entries[i].duration });
      }
    }).observe({ entryTypes: ['longtask'] });
  } catch (err) {
    P.errors.push('longtask observer: ' + String(err));
  }

  var mark = function (key) {
    if (P.marks[key] === undefined) P.marks[key] = performance.now();
  };

  // ── first shader draw, and GPU execution time ───────────────────────────
  // ONE wrapper around drawArrays does both jobs, and it has to be one: the
  // first-draw hook used to delete itself after the first frame, which would
  // tear out the timer's wrapper with it. Stacking two independent getContext
  // wrappers has the same failure.
  //
  // The timer (BLOCKER 2, Task 7b) is EXT_disjoint_timer_query on WebGL 1 —
  // the hero canvas's actual context. It exists because both trace-derived GPU
  // metrics are CPU-side events: doubling the shader's per-pixel loop issues
  // the identical command stream, so the plant was invisible by construction.
  // Measured cost of the timer itself: p50/p95 frame time identical with it on
  // and off (16.700/17.400 vs 16.700/17.400, off-to-off spread 0.000) — the
  // same bar tracing overhead cleared.
  //
  // Three ways this measurement could lie, each closed here:
  //   - blocking on a result stalls the pipeline and changes the frame being
  //     measured, so availability is POLLED and results drain on later frames;
  //   - a GPU_DISJOINT_EXT window invalidates every query overlapping it, so
  //     those are discarded and COUNTED, never averaged in;
  //   - a missing extension is recorded as missing, never as zero.
  var origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var args = Array.prototype.slice.call(arguments);
    var ctx = origGetContext.apply(this, args);
    var isGL = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl';
    if (ctx && isGL && typeof ctx.drawArrays === 'function') {
      var canvas = this;
      var origDraw = ctx.drawArrays;
      var timerExt = null;
      try {
        timerExt = type === 'webgl2'
          ? ctx.getExtension('EXT_disjoint_timer_query_webgl2')
          : ctx.getExtension('EXT_disjoint_timer_query');
      } catch (err) {
        P.errors.push('gpu timer getExtension: ' + String(err));
      }
      var startLabel = (canvas.dataset && canvas.dataset.canvas) || 'canvas';
      if (timerExt) P.gpu.hooked.push(startLabel);
      else P.gpu.missing.push(startLabel);

      var pending = [];
      var drawn = false;
      ctx.drawArrays = function () {
        // Read the label at DRAW time: React may not have committed the
        // data-canvas attribute when the context was created.
        var key = (canvas.dataset && canvas.dataset.canvas) || 'canvas';
        if (!drawn) {
          drawn = true;
          mark('firstDraw:' + key);
          mark('firstDraw');
        }
        if (!timerExt) return origDraw.apply(ctx, arguments);

        var query = timerExt.createQueryEXT ? timerExt.createQueryEXT() : ctx.createQuery();
        if (timerExt.beginQueryEXT) timerExt.beginQueryEXT(timerExt.TIME_ELAPSED_EXT, query);
        else ctx.beginQuery(timerExt.TIME_ELAPSED_EXT, query);
        var out = origDraw.apply(ctx, arguments);
        if (timerExt.endQueryEXT) timerExt.endQueryEXT(timerExt.TIME_ELAPSED_EXT);
        else ctx.endQuery(timerExt.TIME_ELAPSED_EXT);
        // Stamp the DRAW, not the drain: a result surfaces one or more frames
        // later, and windowing on drain time would leak draws across a
        // measurement boundary.
        pending.push({ q: query, t: performance.now() });

        if (!P.gpu.samples[key]) P.gpu.samples[key] = [];
        var still = [];
        for (var i = 0; i < pending.length; i++) {
          var entry = pending[i];
          var q = entry.q;
          if (ctx.getParameter(timerExt.GPU_DISJOINT_EXT)) {
            P.gpu.disjoint++;
            if (timerExt.deleteQueryEXT) timerExt.deleteQueryEXT(q); else ctx.deleteQuery(q);
            continue;
          }
          var ready = timerExt.getQueryObjectEXT
            ? timerExt.getQueryObjectEXT(q, timerExt.QUERY_RESULT_AVAILABLE_EXT)
            : ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE);
          if (ready) {
            P.gpu.samples[key].push({
              t: entry.t,
              ns: timerExt.getQueryObjectEXT
                ? timerExt.getQueryObjectEXT(q, timerExt.QUERY_RESULT_EXT)
                : ctx.getQueryParameter(q, ctx.QUERY_RESULT),
            });
            if (timerExt.deleteQueryEXT) timerExt.deleteQueryEXT(q); else ctx.deleteQuery(q);
          } else still.push(entry);
        }
        pending = still;
        return out;
      };
    }
    return ctx;
  };

  // ── lifecycle marks, read off the DOM the app already stamps ─────────────
  // explosionStart: the loader's GSAP exit writes a transform onto
  //   #loader g.loader-ks every frame; the FIRST write is the anticipation
  //   beat starting, i.e. the entrance window opening.
  // loaderDone:    body[data-loader-state="done"]
  // entranceSettled: [data-entrance="settled"] on the hero section
  //
  // The observer disconnects itself the moment the entrance has settled, so it
  // is never live during a measurement window that starts after settle.
  var scan = function () {
    if (document.body && document.body.dataset && document.body.dataset.loaderState === 'done') mark('loaderDone');
    if (document.querySelector('[data-entrance="settled"]')) mark('entranceSettled');
  };
  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (
        record.type === 'attributes' &&
        record.attributeName === 'transform' &&
        record.target &&
        record.target.classList &&
        record.target.classList.contains('loader-ks')
      ) {
        mark('explosionStart');
      }
    }
    scan();
    if (P.marks.entranceSettled !== undefined) observer.disconnect();
  });
  observer.observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ['transform', 'data-loader-state', 'data-entrance'],
  });
  scan();
})();
`

/** Read the collected buffers out of the page. */
export async function collect(page) {
  return page.evaluate(() => ({
    frames: window.__PERF__.frames,
    longTasks: window.__PERF__.longTasks,
    marks: { ...window.__PERF__.marks },
    overflowed: window.__PERF__.overflowed,
    errors: window.__PERF__.errors,
    gpu: {
      samples: { ...window.__PERF__.gpu.samples },
      disjoint: window.__PERF__.gpu.disjoint,
      hooked: window.__PERF__.gpu.hooked,
      missing: window.__PERF__.gpu.missing,
    },
  }))
}

/** `performance.now()` inside the page — the clock every mark and frame uses. */
export const now = (page) => page.evaluate(() => performance.now())

export const framesIn = (frames, from, to) => frames.filter((t) => t >= from && t <= to)

export const longTasksIn = (longTasks, from, to) =>
  longTasks.filter((task) => task.start + task.duration >= from && task.start <= to)

/**
 * Per-frame GPU execution time for one canvas, in ms, over a window.
 *
 * Returns `null` — never 0 — when the extension was unavailable or nothing was
 * drawn in the window, so a downstream reader cannot mistake "not measured"
 * for "free". `n` is reported alongside so a thin sample is visible.
 */
export function gpuShaderMs(gpu, canvasKey, from, to) {
  const samples = (gpu?.samples?.[canvasKey] ?? []).filter((s) => s.t >= from && s.t <= to)
  if (!samples.length) return { p50Ms: null, p95Ms: null, n: 0, disjoint: gpu?.disjoint ?? 0 }
  const sorted = samples.map((s) => s.ns / 1e6).sort((a, b) => a - b)
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  return { p50Ms: at(0.5), p95Ms: at(0.95), n: sorted.length, disjoint: gpu?.disjoint ?? 0 }
}
