/**
 * Draw the dumbbell on a small offscreen canvas and return sample points in 0–1 space.
 * `step` is the grid spacing on the 400 × 400 drawing. Outline points are always kept; only `fill` of the
 * inside points are.
 */
export function sampleDumbbell(step: number, fill = 0.45): Array<{ x: number; y: number; edge: boolean }> {
  const S = 400;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  ctx.fillStyle = "black"; // mask only — never shown
  rr(36, 186, 328, 28, 10); // bar
  rr(30, 180, 14, 40, 5); // end caps
  rr(356, 180, 14, 40, 5);
  rr(50, 132, 30, 136, 10); // outer plates
  rr(320, 132, 30, 136, 10);
  rr(84, 96, 38, 208, 12); // big plates
  rr(278, 96, 38, 208, 12);
  rr(126, 170, 14, 60, 5); // collars
  rr(260, 170, 14, 60, 5);

  const data = ctx.getImageData(0, 0, S, S).data;
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < S && y < S && data[(Math.floor(y) * S + Math.floor(x)) * 4 + 3] > 128;

  const points: Array<{ x: number; y: number; edge: boolean }> = [];
  for (let y = step / 2; y < S; y += step) {
    for (let x = step / 2; x < S; x += step) {
      if (!inside(x, y)) continue;
      const edge = !inside(x + step, y) || !inside(x - step, y) || !inside(x, y + step) || !inside(x, y - step);
      if (edge || Math.random() < fill) {
        points.push({
          x: (x + (Math.random() - 0.5) * step * 0.5) / S,
          y: (y + (Math.random() - 0.5) * step * 0.5) / S,
          edge,
        });
      }
    }
  }
  return points;
}
