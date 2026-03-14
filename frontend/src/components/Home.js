import React, { useState } from 'react';
import BottomSheet from './BottomSheet';

export default function Home({ onJoin, onViewLeaderboard }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!password) { setError('Please enter a password'); return; }
    setLoading(true);
    setError('');
    try {
      await onJoin(name.trim(), password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] fade-in-up">
      {/* Logo */}
      <div className="mb-6 sparkle-container">
        <img src="/logo.png" alt="Oscar Bait" className="w-24 h-32 object-contain statuette-glow" />
        <span className="sparkle-dot" style={{top:'4px',right:'-4px',animationDelay:'0s'}}>✦</span>
        <span className="sparkle-dot" style={{top:'30px',left:'-6px',animationDelay:'0.8s'}}>✦</span>
        <span className="sparkle-dot" style={{top:'16px',right:'-8px',animationDelay:'1.6s',fontSize:'8px'}}>✦</span>
        <span className="sparkle-dot" style={{bottom:'30px',left:'-3px',animationDelay:'0.4s'}}>✦</span>
        <span className="sparkle-dot" style={{bottom:'14px',right:'-5px',animationDelay:'1.2s',fontSize:'8px'}}>✦</span>
        <span className="sparkle-dot" style={{top:'50%',left:'-8px',animationDelay:'2.0s'}}>✦</span>
      </div>

      <h1 className="font-serif text-5xl md:text-7xl font-bold gold-shimmer mb-3">
        Oscar Bait
      </h1>
      <p className="text-oscar-white/50 text-lg mb-10 text-center max-w-md font-sans">
        The 98th Academy Awards prediction game. Rank the nominees. Win the party.
      </p>

      <form onSubmit={handleSubmit} autoComplete="off" className="w-full max-w-sm space-y-4">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-5 py-4 bg-oscar-black gold-border-bright rounded-lg text-oscar-white placeholder-oscar-white/30 focus:outline-none focus:border-oscar-gold text-center text-lg font-sans transition-colors"
            maxLength={30}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="relative">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            className="w-full px-5 py-4 bg-oscar-black gold-border-bright rounded-lg text-oscar-white placeholder-oscar-white/30 focus:outline-none focus:border-oscar-gold text-center text-lg font-sans transition-colors"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            style={{WebkitTextSecurity: 'disc'}}
          />
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 gold-gradient rounded-lg text-oscar-black font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join the Game'}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setShowHowToPlay(true)}
          className="text-oscar-gold/60 hover:text-oscar-gold text-sm transition-colors"
        >
          How to Play
        </button>
        <span className="text-oscar-white/20">|</span>
        <button
          onClick={onViewLeaderboard}
          className="text-oscar-gold/60 hover:text-oscar-gold text-sm transition-colors"
        >
          View Leaderboard →
        </button>
      </div>

      <p className="mt-16 text-oscar-white/20 text-xs">
        March 15, 2026 — 98th Academy Awards
      </p>

      {/* How to Play modal */}
      <BottomSheet
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        maxHeight="85vh"
        title="How to Play"
      >
        <div className="space-y-5">
          <div>
            <h4 className="font-serif font-semibold text-base mb-2" style={{ color: '#C5A44E' }}>Rank Your Picks</h4>
            <p style={{ color: '#E0E0E0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Drag nominees to rank them in each category. Your #1 pick is who you think will win.
            </p>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-base mb-2" style={{ color: '#C5A44E' }}>Scoring</h4>
            <p style={{ color: '#E0E0E0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, marginBottom: 8 }}>
              The higher you rank the actual winner, the more points you earn.
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(197, 164, 78, 0.2)' }}>
              <div className="px-4 py-2 text-xs font-sans font-medium text-oscar-white/40 flex justify-between" style={{ background: 'rgba(197, 164, 78, 0.08)' }}>
                <span>Your Rank</span>
                <span>Points Earned</span>
              </div>
              {[
                { rank: '#1 pick', pts: '5 pts', highlight: true },
                { rank: '#2 pick', pts: '4 pts', highlight: false },
                { rank: '#3 pick', pts: '3 pts', highlight: false },
                { rank: '#4 pick', pts: '2 pts', highlight: false },
                { rank: '#5 pick', pts: '1 pt', highlight: false },
              ].map((row, i) => (
                <div
                  key={row.rank}
                  className="px-4 py-1.5 flex justify-between items-center text-sm"
                  style={{ background: i % 2 === 0 ? '#141414' : '#1A1A1A' }}
                >
                  <span className="text-oscar-white/70 font-sans">
                    {row.highlight && <span className="mr-1.5">🎯</span>}
                    {row.rank}
                  </span>
                  <span className="font-bold font-serif" style={{ color: row.highlight ? '#C5A44E' : 'rgba(197, 164, 78, 0.6)' }}>
                    {row.pts}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-oscar-white/40 text-xs mt-2">
              Example for a category with 5 nominees. Points scale with the number of nominees.
            </p>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-base mb-2" style={{ color: '#C5A44E' }}>Scouting Reports</h4>
            <p style={{ color: '#E0E0E0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Haven't seen everything? Tap the <span style={{ color: '#C5A44E' }}>Scouting Report</span> button on any category for quick takes on each nominee.
            </p>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-base mb-2" style={{ color: '#C5A44E' }}>On Oscar Night</h4>
            <p style={{ color: '#E0E0E0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              When winners are announced live, a dramatic reveal plays for each category. The leaderboard shifts in real time — watch your rank climb as results come in.
            </p>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
