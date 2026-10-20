/** Small synthesized cues (no audio files to download or cache). Off unless the player turns sound on. */
export type Cue = 'yourTurn' | 'play' | 'draw' | 'win';

const NOTES: Record<Cue, { f: number; at: number; len: number }[]> = {
  yourTurn: [{ f: 660, at: 0, len: 0.12 }, { f: 880, at: 0.12, len: 0.16 }],
  play: [{ f: 520, at: 0, len: 0.08 }],
  draw: [{ f: 330, at: 0, len: 0.08 }],
  win: [{ f: 523, at: 0, len: 0.14 }, { f: 659, at: 0.14, len: 0.14 }, { f: 784, at: 0.28, len: 0.28 }],
};

let ctx: AudioContext | null = null;

export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (const n of NOTES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + n.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.len + 0.02);
    }
  } catch { /* audio blocked or unsupported: the game works without it */ }
}
