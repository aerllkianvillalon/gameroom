import { motionReduced } from './motion';

interface Piece {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number;
  color: string; round: boolean; flip: number; flipSpeed: number;
}

const VARS = ['--card-red', '--card-yellow', '--card-green', '--card-blue', '--plum', '--paper'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
let stop: (() => void) | null = null;

/**
 * One burst of confetti over the whole screen: two cannons from the bottom corners and a little rain from above.
 * Skipped when motion is reduced. Never blocks taps, and removes itself when it is done.
 */
export function fireConfetti({ count = 150, duration = 3600 }: { count?: number; duration?: number } = {}) {
  if (motionReduced()) return;
  stop?.();

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const css = getComputedStyle(document.documentElement);
  const colors = VARS.map((v) => `rgb(${css.getPropertyValue(v).trim().split(/\s+/).join(',')})`);
  const power = Math.min(1, h / 800) * 0.55 + 0.45;

  const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
    const cannon = i < count * 0.7;
    const left = i % 2 === 0;
    const angle = left ? rand(-80, -55) : rand(-125, -100); // degrees, up and inward
    const speed = rand(650, 1250) * power;
    const rad = (angle * Math.PI) / 180;
    return {
      x: cannon ? (left ? -10 : w + 10) : rand(0, w),
      y: cannon ? h + 10 : rand(-h * 0.3, -10),
      vx: cannon ? Math.cos(rad) * speed : rand(-60, 60),
      vy: cannon ? Math.sin(rad) * speed : rand(40, 160),
      rot: rand(0, Math.PI * 2), vr: rand(-8, 8),
      w: rand(6, 11), h: rand(10, 17), color: colors[i % colors.length]!, round: Math.random() < 0.2,
      flip: rand(0, Math.PI * 2), flipSpeed: rand(6, 14),
    };
  });

  let raf = 0, last = performance.now();
  const start = last;
  const end = () => { cancelAnimationFrame(raf); canvas.remove(); if (stop === end) stop = null; };
  stop = end;

  const frame = (t: number) => {
    const dt = Math.min(0.04, (t - last) / 1000);
    last = t;
    const age = t - start;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const p of pieces) {
      p.vy += 980 * dt;
      p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 0.9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.flipSpeed * dt;
      if (p.y > h + 40) continue;
      alive += 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, (duration - age) / 700));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip)); // tumbling paper
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive === 0 || age > duration) end(); else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
