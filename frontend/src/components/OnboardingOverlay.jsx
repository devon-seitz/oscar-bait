import React, { useState, useEffect, useCallback } from 'react';

const STEPS = [
  {
    title: 'Welcome to Oscar Bait',
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          Gather your friends, rank your picks, and compete live on Oscar night.
        </p>
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: '2px solid rgba(197, 164, 78, 0.4)' }}>
            <span className="text-4xl">🏆</span>
          </div>
        </div>
        <p className="text-oscar-white/50 text-sm md:text-base leading-relaxed">
          Think you know the Academy better than everyone at the party? Prove it.
        </p>
      </>
    ),
  },
  {
    title: '24 Categories, Your Picks',
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          Every Oscar category has a list of nominees. Your job: rank them from most likely to win to least likely.
        </p>
        <div className="space-y-2 mb-6 max-w-xs mx-auto">
          {['Best Picture', 'Best Director', 'Best Actress'].map((cat, i) => (
            <div
              key={cat}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
              style={{ background: 'rgba(197, 164, 78, 0.08)', border: '1px solid rgba(197, 164, 78, 0.15)' }}
            >
              <span className="font-serif font-bold text-lg" style={{ color: '#C5A44E' }}>{i + 1}</span>
              <span className="text-oscar-white/70 text-sm font-sans">{cat}</span>
            </div>
          ))}
          <p className="text-oscar-white/30 text-xs text-center mt-1">...and 21 more</p>
        </div>
        <p className="text-oscar-white/50 text-sm leading-relaxed">
          Rank as many or as few categories as you like — every pick counts.
        </p>
      </>
    ),
  },
  {
    title: 'Drag to Rank',
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          Tap and hold a nominee, then drag to reorder. Your #1 pick is who you think will win.
        </p>
        <div className="space-y-2 mb-6 max-w-xs mx-auto">
          {[
            { rank: 1, name: 'Your top pick', highlight: true },
            { rank: 2, name: 'Second choice', highlight: false },
            { rank: 3, name: 'Third choice', highlight: false },
          ].map((item) => (
            <div
              key={item.rank}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: item.highlight ? 'rgba(197, 164, 78, 0.15)' : 'rgba(250, 248, 245, 0.03)',
                border: item.highlight ? '1px solid rgba(197, 164, 78, 0.4)' : '1px solid rgba(250, 248, 245, 0.08)',
              }}
            >
              <span className="font-serif font-bold text-base" style={{ color: item.highlight ? '#C5A44E' : 'rgba(250, 248, 245, 0.3)' }}>
                #{item.rank}
              </span>
              <span className="text-sm font-sans" style={{ color: item.highlight ? '#FAF8F5' : 'rgba(250, 248, 245, 0.5)' }}>
                {item.name}
              </span>
              <span className="ml-auto text-oscar-white/20 text-lg">⠿</span>
            </div>
          ))}
        </div>
        <p className="text-oscar-white/50 text-sm leading-relaxed">
          Your picks auto-save as you go. When you're confident, lock in your ballot.
        </p>
      </>
    ),
  },
  {
    title: "Haven't Seen Everything?",
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          No problem. Every nominee has a short scouting report to help you pick.
        </p>
        <div className="space-y-3 mb-6 max-w-xs mx-auto">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(250, 248, 245, 0.03)', border: '1px solid rgba(250, 248, 245, 0.08)' }}
          >
            <span className="flex items-center justify-center w-6 h-6 flex-shrink-0">
              <svg className="w-4 h-4" style={{ color: '#A0A0A0' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </span>
            <span className="text-oscar-white/60 text-sm font-sans leading-relaxed">
              Tap the <span style={{ color: '#C5A44E' }}>info icon</span> on any nominee for a quick take
            </span>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(250, 248, 245, 0.03)', border: '1px solid rgba(250, 248, 245, 0.08)' }}
          >
            <span className="text-base flex-shrink-0">📋</span>
            <span className="text-oscar-white/60 text-sm font-sans leading-relaxed">
              Tap <span style={{ color: '#C5A44E' }}>Scouting Report</span> for the full category rundown
            </span>
          </div>
        </div>
        <p className="text-oscar-white/50 text-sm leading-relaxed">
          You don't need to be a film critic — just trust your gut and have fun.
        </p>
      </>
    ),
  },
  {
    title: 'How Scoring Works',
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          The higher you rank the actual winner, the more points you earn.
        </p>
        <div className="rounded-lg overflow-hidden mb-6 max-w-xs mx-auto" style={{ border: '1px solid rgba(197, 164, 78, 0.2)' }}>
          <div className="px-4 py-2.5 text-xs font-sans font-medium text-oscar-white/40 flex justify-between" style={{ background: 'rgba(197, 164, 78, 0.08)' }}>
            <span>Your Rank</span>
            <span>Points Earned</span>
          </div>
          {[
            { rank: '#1 pick', pts: '5 pts', highlight: true, emoji: '🎯' },
            { rank: '#2 pick', pts: '4 pts', highlight: false, emoji: '' },
            { rank: '#3 pick', pts: '3 pts', highlight: false, emoji: '' },
            { rank: '#5 pick', pts: '1 pt', highlight: false, emoji: '' },
          ].map((row, i) => (
            <div
              key={row.rank}
              className="px-4 py-2 flex justify-between items-center text-sm"
              style={{ background: i % 2 === 0 ? '#141414' : '#1A1A1A' }}
            >
              <span className="text-oscar-white/70 font-sans">
                {row.emoji && <span className="mr-1.5">{row.emoji}</span>}
                {row.rank}
              </span>
              <span className="font-bold font-serif" style={{ color: row.highlight ? '#C5A44E' : 'rgba(197, 164, 78, 0.6)' }}>
                {row.pts}
              </span>
            </div>
          ))}
        </div>
        <p className="text-oscar-white/50 text-sm leading-relaxed">
          Example: 5 nominees in a category. Rank the winner #1 and earn the max 5 points.
        </p>
      </>
    ),
  },
  {
    title: 'On Oscar Night',
    content: (
      <>
        <p className="text-oscar-white/70 text-base md:text-lg leading-relaxed mb-6">
          When winners are announced live, everyone at the party sees the reveal together.
        </p>
        <div className="space-y-3 mb-6 max-w-xs mx-auto">
          {[
            { icon: '🎬', text: 'A dramatic reveal plays for each winner' },
            { icon: '📊', text: 'See how everyone ranked — and who nailed it' },
            { icon: '🏅', text: 'Watch the leaderboard shift in real time' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-start gap-3 px-4 py-2.5 rounded-lg"
              style={{ background: 'rgba(250, 248, 245, 0.03)', border: '1px solid rgba(250, 248, 245, 0.06)' }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
              <span className="text-oscar-white/60 text-sm font-sans leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-oscar-white/50 text-sm leading-relaxed">
          Get your picks in before the ceremony starts — then sit back and enjoy the show.
        </p>
      </>
    ),
    isFinal: true,
  },
];

const FADE_DURATION = 600;

export default function OnboardingOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [fading, setFading] = useState(false);

  const dismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => onDismiss(), FADE_DURATION);
  }, [fading, onDismiss]);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setAnimKey((k) => k + 1);
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setAnimKey((k) => k + 1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goBack, dismiss]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const currentStep = STEPS[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tutorial"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 0, 0, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
      }}
    >
      {/* Skip button */}
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3 py-2 text-sm font-sans text-oscar-white/40 hover:text-oscar-white/70 transition-colors min-h-[44px]"
      >
        Skip
      </button>

      {/* Step content */}
      <div
        className="w-full max-w-md px-6 text-center"
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div
          key={animKey}
          className={direction > 0 ? 'step-slide-right' : 'step-slide-left'}
        >
          <h2
            className="font-serif text-2xl md:text-3xl font-bold gold-text-gradient mb-6"
            style={{ letterSpacing: '0.02em' }}
          >
            {currentStep.title}
          </h2>
          {currentStep.content}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 px-6">
        <div className="max-w-md mx-auto">
          {/* Action button */}
          <button
            onClick={goNext}
            className="w-full py-3.5 gold-gradient rounded-lg text-oscar-black font-semibold text-base hover:opacity-90 transition-opacity min-h-[44px]"
          >
            {currentStep.isFinal ? 'Start Picking' : 'Next'}
          </button>

          {/* Dots + Back */}
          <div className="flex items-center justify-center mt-4 relative">
            {step > 0 && (
              <button
                onClick={goBack}
                className="absolute left-0 text-sm font-sans text-oscar-white/40 hover:text-oscar-white/70 transition-colors min-h-[44px] flex items-center"
              >
                Back
              </button>
            )}
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: i === step ? '#C5A44E' : 'rgba(250, 248, 245, 0.15)',
                    transform: i === step ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
