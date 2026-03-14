import React, { useState } from 'react';

export default function Home({ onJoin, onViewLeaderboard }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-5 py-4 bg-oscar-black gold-border-bright rounded-lg text-oscar-white placeholder-oscar-white/30 focus:outline-none focus:border-oscar-gold text-center text-lg font-sans transition-colors"
            maxLength={30}
            autoFocus
          />
        </div>
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            className="w-full px-5 py-4 bg-oscar-black gold-border-bright rounded-lg text-oscar-white placeholder-oscar-white/30 focus:outline-none focus:border-oscar-gold text-center text-lg font-sans transition-colors"
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

      <button
        onClick={onViewLeaderboard}
        className="mt-6 text-oscar-gold/60 hover:text-oscar-gold text-sm transition-colors"
      >
        View Leaderboard →
      </button>

      <p className="mt-16 text-oscar-white/20 text-xs">
        March 15, 2026 — 98th Academy Awards
      </p>
    </div>
  );
}
