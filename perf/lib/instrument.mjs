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
  };
  window.__PERF__ = P;

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

  // ── first shader draw ───────────────────────────────────────────────────
  // Wrap getContext so the FIRST drawArrays on each WebGL context stamps its
  // time and then restores the original function. One extra call on one frame
  // in the page's life; nothing measurable, and no dependency on
  // ?perf-counters (whose gl proxy would itself change what we measure).
  var origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var args = Array.prototype.slice.call(arguments);
    var ctx = origGetContext.apply(this, args);
    var isGL = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl';
    if (ctx && isGL && typeof ctx.drawArrays === 'function') {
      var canvas = this;
      var origDraw = ctx.drawArrays;
      ctx.drawArrays = function () {
        var key = (canvas.dataset && canvas.dataset.canvas) || 'canvas';
        mark('firstDraw:' + key);
        mark('firstDraw');
        try { delete ctx.drawArrays; } catch (e) { ctx.drawArrays = origDraw; }
        return origDraw.apply(ctx, arguments);
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
  }))
}

/** `performance.now()` inside the page — the clock every mark and frame uses. */
export const now = (page) => page.evaluate(() => performance.now())

export const framesIn = (frames, from, to) => frames.filter((t) => t >= from && t <= to)

export const longTasksIn = (longTasks, from, to) =>
  longTasks.filter((task) => task.start + task.duration >= from && task.start <= to)
