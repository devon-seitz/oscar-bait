import React, { useState } from 'react';

export default function Home({ onJoin, onViewLeaderboard }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name'); return; }
    setLoading(true);
    setError('');
    try {
      await onJoin(name.trim());
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] fade-in-up">
      {/* Trophy icon */}
      <div className="mb-6">
        <svg className="w-24 h-24 text-oscar-gold opacity-80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15c-3.31 0-6-2.69-6-6V3h12v6c0 3.31-2.69 6-6 6zm8-12h-2v6c0 1.1-.22 2.15-.62 3.11.92-.55 1.62-1.57 1.62-2.73V5c0-.55-.45-1-1-1zm-14 0H4c-.55 0-1 .45-1 1v1.38c0 1.16.7 2.18 1.62 2.73C4.22 8.15 4 7.1 4 6V3zm4 15v2H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2c3.95-.49 7-3.85 7-7.9V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4.1c0 4.05 3.05 7.41 7 7.9z"/>
        </svg>
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
