let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Call this on any user interaction to unlock audio
export function unlockAudio() {
  getCtx();
}

// Subtle two-note chime — new winner announced
export function playWinnerChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    // First note
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second note, slightly delayed
    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
    osc2.connect(gain2);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);

    // Third note — drops down for a "not quite" feel
    const gain3 = ctx.createGain();
    gain3.connect(ctx.destination);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.10, now + 0.35);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(587.33, now + 0.35); // D5
    osc3.connect(gain3);
    osc3.start(now + 0.35);
    osc3.stop(now + 1.0);
  } catch (e) { /* ignore audio errors */ }
}

// Triumphant three-note rising arpeggio — you nailed the #1 pick
export function playPerfectPickSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const delays = [0, 0.12, 0.24, 0.36];

    notes.forEach((freq, i) => {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const t = now + delays[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(i === 3 ? 0.2 : 0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (i === 3 ? 1.5 : 0.8));

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + (i === 3 ? 1.5 : 0.8));

      // Add a subtle harmonic on the last note
      if (i === 3) {
        const gain2 = ctx.createGain();
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0, t);
        gain2.gain.linearRampToValueAtTime(0.06, t + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 1.8);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, t);
        osc2.connect(gain2);
        osc2.start(t);
        osc2.stop(t + 1.8);
      }
    });
  } catch (e) { /* ignore audio errors */ }
}

// Low suspenseful tone for the envelope opening
export function playDrumroll() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Low sine wave swelling
    const gain1 = ctx.createGain();
    gain1.connect(ctx.destination);
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 1.5);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(130.81, now); // C3
    osc1.connect(gain1);
    osc1.start(now);
    osc1.stop(now + 2.0);

    // Fifth above, fades in later for harmonic tension
    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.01, now);
    gain2.gain.setValueAtTime(0.01, now + 0.8);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 1.5);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(196.0, now); // G3
    osc2.connect(gain2);
    osc2.start(now + 0.8);
    osc2.stop(now + 2.0);
  } catch (e) { /* ignore audio errors */ }
}

// Emphatic brass-like fanfare for the winner reveal
export function playRevealSting() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const delays = [0, 0.08, 0.16, 0.24];

    notes.forEach((freq, i) => {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const t = now + delays[i];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(i === 3 ? 0.25 : 0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (i === 3 ? 1.8 : 0.6));

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + (i === 3 ? 1.8 : 0.6));

      // Harmonic overtone on each note for richness
      const gain2 = ctx.createGain();
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(i === 3 ? 0.08 : 0.05, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + (i === 3 ? 2.0 : 0.5));

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, t);
      osc2.connect(gain2);
      osc2.start(t);
      osc2.stop(t + (i === 3 ? 2.0 : 0.5));
    });
  } catch (e) { /* ignore audio errors */ }
}
