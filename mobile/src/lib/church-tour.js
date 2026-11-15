// Advance independently of animation completion so an interrupted native
// animation cannot strand the visitor midway through the guided tour.
export function startChurchTour(order, { onStep, onFadeOut, onDone, fadeMs, schedule = setTimeout, cancel = clearTimeout }) {
  let index = 0;
  let stopped = false;
  let timer;
  function step() {
    if (stopped) return;
    if (index >= order.length) { onDone(); return; }
    onStep(order[index++]);
    timer = schedule(() => {
      if (stopped) return;
      onFadeOut();
      timer = schedule(step, fadeMs + 80);
    }, fadeMs + 2800);
  }
  timer = schedule(step, 150);
  return () => { stopped = true; cancel(timer); };
}
