'use strict';
// Circular knob math is shared by pointer controls and seam-crossing tests.
window.ChocoDial = {
  angle(x, y, cx, cy) { return Math.atan2(x - cx, cy - y) * 180 / Math.PI; },
  delta(previous, next) { return ((next - previous + 540) % 360) - 180; },
  turn(value, degrees, kind, fine = false) {
    const fraction = degrees / 360 * (fine ? .1 : 1);
    const next = kind === 'hz' ? value * Math.pow(1000, fraction) : value + fraction * 100;
    return Math.min(kind === 'hz' ? 20000 : 100, Math.max(kind === 'hz' ? 20 : 0, next));
  }
};
