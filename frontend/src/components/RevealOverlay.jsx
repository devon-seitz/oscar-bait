import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playDrumroll, playRevealSting } from '../sounds';

const PHASE_DURATIONS = {
  envelope: 2000,
  winner: 2500,
  scoreboard: 2500,
};
const FADE_DURATION = 800;
const PHASE_TRANSITION = 600; // crossfade between phases

export default function RevealOverlay({ announcement, onDismiss, currentPlayerName }) {
  const [phase, setPhase] = useState('envelope');
  const [transitioning, setTransitioning] = useState(false);
  const [fading, setFading] = useState(false);
  const timersRef = useRef([]);
  const phaseRef = useRef('envelope');

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const transitionTo = useCallback((nextPhase, extras) => {
    setTransitioning(true);
    addTimer(() => {
      setPhase(nextPhase);
      phaseRef.current = nextPhase;
      if (extras) extras();
      addTimer(() => setTransitioning(false), 50);
    }, PHASE_TRANSITION);
  }, [addTimer]);

  const dismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    clearTimers();
    addTimer(() => onDismiss(), FADE_DURATION);
  }, [fading, clearTimers, addTimer, onDismiss]);

  const fireConfetti = useCallback(() => {
    const gold = ['#C5A44E', '#D4B96A', '#E8D5A3', '#FAF8F5'];
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.45 },
      colors: gold,
      gravity: 0.8,
      ticks: 200,
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5, x: 0.4 },
        colors: gold,
        gravity: 0.9,
        ticks: 150,
      });
    }, 200);
  }, []);

  // Phase auto-advance: envelope → winner → scoreboard
  useEffect(() => {
    playDrumroll();

    addTimer(() => {
      transitionTo('winner', () => {
        playRevealSting();
        fireConfetti();
      });
    }, PHASE_DURATIONS.envelope);

    addTimer(() => {
      transitionTo('scoreboard');
    }, PHASE_DURATIONS.envelope + PHASE_TRANSITION + PHASE_DURATIONS.winner);

    return clearTimers;
    // eslint-disable-next-line
  }, []);

  // Auto-dismiss when scoreboard phase is reached
  useEffect(() => {
    if (phase !== 'scoreboard') return;
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => onDismiss(), FADE_DURATION);
    }, PHASE_DURATIONS.scoreboard);
    return () => clearTimeout(timer);
  }, [phase, onDismiss]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleClick = () => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'envelope' || currentPhase === 'winner') {
      clearTimers();
      if (currentPhase === 'envelope') {
        playRevealSting();
        fireConfetti();
      }
      transitionTo('scoreboard');
    } else if (currentPhase === 'scoreboard') {
      dismiss();
    }
  };

  const { category, winner, player_results = [] } = announcement;
  const topPoints = player_results.length > 0 ? player_results[0].points_earned : 0;
  const maxPoints = player_results.length > 0 ? player_results[0].max_points : 0;

  const contentOpacity = transitioning ? 0 : 1;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
      }}
    >
      <div
        style={{
          opacity: contentOpacity,
          transition: `opacity ${PHASE_TRANSITION}ms ease-in-out`,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Phase 1: Envelope */}
        {phase === 'envelope' && (
          <div className="envelope-fade-in text-center px-4 sm:px-6">
            <p
              className="font-serif text-oscar-white/70 text-xl md:text-2xl mb-4"
              style={{ letterSpacing: '0.1em' }}
            >
              And the Oscar for
            </p>
            <h2
              className="font-serif font-bold text-3xl md:text-4xl mb-6"
              style={{ color: '#C5A44E', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {category}
            </h2>
            <p
              className="font-serif text-oscar-white/70 text-xl md:text-2xl"
              style={{ letterSpacing: '0.1em' }}
            >
              goes to
              <span className="animate-dot-1">.</span>
              <span className="animate-dot-2">.</span>
              <span className="animate-dot-3">.</span>
            </p>
          </div>
        )}

        {/* Phase 2: Winner */}
        {phase === 'winner' && (
          <div className="text-center px-4 sm:px-6">
            <p
              className="font-serif text-oscar-white/50 text-base md:text-lg mb-3"
              style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
            >
              {category}
            </p>
            <h1
              className="slam-in font-serif font-bold gold-glow"
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                color: '#C5A44E',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
              }}
            >
              {winner}
            </h1>
          </div>
        )}

        {/* Phase 3: Scoreboard */}
        {phase === 'scoreboard' && (
          <div className="scoreboard-slide-up w-full max-w-lg px-3 sm:px-6" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="text-center mb-4 sm:mb-6">
              <p
                className="font-serif text-oscar-white/50 text-sm sm:text-base mb-2"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                {category}
              </p>
              <h2
                className="font-serif font-bold text-2xl md:text-3xl gold-glow"
                style={{ color: '#C5A44E', textTransform: 'uppercase' }}
              >
                {winner}
              </h2>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(197, 164, 78, 0.2)' }}>
              {player_results.map((result, i) => {
                const isCurrentPlayer = result.player_name === currentPlayerName;
                const isTopScorer = result.points_earned === topPoints && topPoints > 0;
                const isLastPick = result.rank_given === maxPoints;
                const bgColor = i % 2 === 0 ? '#141414' : '#1A1A1A';

                return (
                  <div
                    key={result.player_name}
                    style={{
                      backgroundColor: bgColor,
                      borderLeft: isCurrentPlayer ? '3px solid #C5A44E' : '3px solid transparent',
                    }}
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:flex items-center justify-between px-4 py-3 text-base">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-center flex-shrink-0">
                          {isTopScorer ? '\u{1F3C6}' : ''}
                        </span>
                        <span
                          className="font-medium truncate"
                          style={{ color: isCurrentPlayer ? '#C5A44E' : '#FAF8F5' }}
                        >
                          {result.player_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-oscar-white/50 text-sm">
                          {result.rank_given
                            ? `#${result.rank_given} pick`
                            : 'no pick'}
                          {isLastPick && result.rank_given ? ' \u{1F62C}' : ''}
                        </span>
                        <span
                          className="font-bold tabular-nums w-16 text-right"
                          style={{ color: result.points_earned > 0 ? '#C5A44E' : 'rgba(250, 248, 245, 0.3)' }}
                        >
                          +{result.points_earned} pt{result.points_earned !== 1 ? 's' : ''}
                        </span>
                        <span className="text-oscar-white/30 text-xs tabular-nums w-14 text-right">
                          {result.total_score} total
                        </span>
                      </div>
                    </div>

                    {/* Mobile row — stacked */}
                    <div className="sm:hidden px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 text-center flex-shrink-0 text-sm">
                            {isTopScorer ? '\u{1F3C6}' : ''}
                          </span>
                          <span
                            className="font-medium truncate text-sm"
                            style={{ color: isCurrentPlayer ? '#C5A44E' : '#FAF8F5' }}
                          >
                            {result.player_name}
                          </span>
                        </div>
                        <span
                          className="font-bold tabular-nums text-sm flex-shrink-0"
                          style={{ color: result.points_earned > 0 ? '#C5A44E' : 'rgba(250, 248, 245, 0.3)' }}
                        >
                          +{result.points_earned} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 pl-6">
                        <span className="text-oscar-white/40 text-xs">
                          {result.rank_given
                            ? `#${result.rank_given} pick`
                            : 'no pick'}
                          {isLastPick && result.rank_given ? ' \u{1F62C}' : ''}
                        </span>
                        <span className="text-oscar-white/30 text-xs tabular-nums">
                          {result.total_score} total
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {player_results.length === 0 && (
                <div className="px-4 py-6 text-center text-oscar-white/40">
                  No predictions were made
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
