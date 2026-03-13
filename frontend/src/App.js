import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import Home from './components/Home';
import Ballot from './components/Ballot';
import Leaderboard from './components/Leaderboard';
import Admin from './components/Admin';
import RevealOverlay from './components/RevealOverlay';

export default function App() {
  const storedPlayer = () => {
    try { const p = JSON.parse(localStorage.getItem('oscar_bait_player')); return p?.id ? p : null; } catch { return null; }
  };
  const [page, setPage] = useState(() => storedPlayer() ? 'ballot' : 'home');
  const [player, setPlayer] = useState(storedPlayer);
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [picks, setPicks] = useState({});
  const [revealQueue, setRevealQueue] = useState([]);
  const [activeReveal, setActiveReveal] = useState(null);
  const lastSeenAnnouncementTimeRef = useRef(new Date().toISOString());

  // Check URL hash for admin
  useEffect(() => {
    if (window.location.hash === '#admin') setPage('admin');
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (e) { console.error(e); }
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    try {
      const lb = await api.getLeaderboard();
      setLeaderboard(lb);
    } catch (e) { console.error(e); }
  }, []);

  const refreshPicks = useCallback(async () => {
    if (!player) return;
    try {
      const p = await api.getPicks(player.id);
      setPicks(p);
    } catch (e) { console.error(e); }
  }, [player]);

  const refreshAnnouncement = useCallback(async () => {
    try {
      const data = await api.getLatestAnnouncement();
      if (data && data.announced_at && data.announced_at > lastSeenAnnouncementTimeRef.current) {
        setRevealQueue(prev => {
          if (prev.some(a => a.announced_at === data.announced_at)) return prev;
          return [...prev, data];
        });
        lastSeenAnnouncementTimeRef.current = data.announced_at;
      }
    } catch (e) { console.error(e); }
  }, []);

  // Process reveal queue
  useEffect(() => {
    if (!activeReveal && revealQueue.length > 0) {
      setActiveReveal(revealQueue[0]);
      setRevealQueue(prev => prev.slice(1));
    }
  }, [activeReveal, revealQueue]);

  const handleRevealDismiss = useCallback(() => {
    setActiveReveal(null);
    refreshCategories();
    refreshLeaderboard();
  }, [refreshCategories, refreshLeaderboard]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  // Poll leaderboard + categories + announcements every 12 seconds on all pages
  useEffect(() => {
    const interval = setInterval(() => {
      refreshLeaderboard();
      refreshCategories();
      refreshAnnouncement();
    }, 12000);
    return () => clearInterval(interval);
  }, [refreshLeaderboard, refreshCategories, refreshAnnouncement]);

  useEffect(() => {
    if (page === 'leaderboard' || page === 'ballot') refreshLeaderboard();
  }, [page, refreshLeaderboard]);

  useEffect(() => {
    if (player) refreshPicks();
  }, [player, refreshPicks]);

  const handleJoin = async (name) => {
    const p = await api.createPlayer(name);
    setPlayer(p);
    localStorage.setItem('oscar_bait_player', JSON.stringify(p));
    setPage('ballot');
  };

  const handleLogout = () => {
    setPlayer(null);
    setPicks({});
    localStorage.removeItem('oscar_bait_player');
    setPage('home');
  };

  const handleSubmitPick = async (category, rankings) => {
    await api.submitPicks(player.id, category, rankings);
    await refreshPicks();
  };

  const handleLockPicks = async () => {
    await api.lockPicks(player.id);
    await refreshPicks();
  };

  return (
    <div className="min-h-screen bg-oscar-black">
      {activeReveal && (
        <RevealOverlay
          announcement={activeReveal}
          onDismiss={handleRevealDismiss}
          currentPlayerName={player?.name}
        />
      )}
      {/* Nav */}
      <nav className="border-b border-oscar-gold/20 bg-oscar-black/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPage(player ? 'ballot' : 'home')} className="flex items-center gap-2 group">
            <Trophy className="w-6 h-6 text-oscar-gold" />
            <span className="font-serif text-xl font-bold gold-text-gradient">Oscar Bait</span>
          </button>
          <div className="flex gap-2">
            {player && (
              <button
                onClick={() => setPage('ballot')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${page === 'ballot' ? 'bg-oscar-gold/20 text-oscar-gold' : 'text-oscar-white/60 hover:text-oscar-white'}`}
              >
                Ballot
              </button>
            )}
            <button
              onClick={() => setPage('leaderboard')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${page === 'leaderboard' ? 'bg-oscar-gold/20 text-oscar-gold' : 'text-oscar-white/60 hover:text-oscar-white'}`}
            >
              Leaderboard
            </button>
            {player && (
              <span className="px-3 py-1.5 text-sm text-oscar-champagne/60">{player.name}</span>
            )}
            {player && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded text-sm font-medium text-oscar-white/40 hover:text-oscar-white/70 transition-colors"
              >
                Switch Player
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Pages */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {page === 'home' && <Home onJoin={handleJoin} onViewLeaderboard={() => setPage('leaderboard')} />}
        {page === 'ballot' && (
          <Ballot
            categories={categories}
            picks={picks}
            leaderboard={leaderboard}
            player={player}
            onSubmitPick={handleSubmitPick}
            onLockPicks={handleLockPicks}
          />
        )}
        {page === 'leaderboard' && (
          <Leaderboard data={leaderboard} categories={categories} currentPlayerName={player?.name} />
        )}
        {page === 'admin' && <Admin categories={categories} onRefresh={refreshCategories} />}
      </main>
    </div>
  );
}

function Trophy({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15c-3.31 0-6-2.69-6-6V3h12v6c0 3.31-2.69 6-6 6zm8-12h-2v6c0 1.1-.22 2.15-.62 3.11.92-.55 1.62-1.57 1.62-2.73V5c0-.55-.45-1-1-1zm-14 0H4c-.55 0-1 .45-1 1v1.38c0 1.16.7 2.18 1.62 2.73C4.22 8.15 4 7.1 4 6V3zm4 15v2H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2c3.95-.49 7-3.85 7-7.9V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4.1c0 4.05 3.05 7.41 7 7.9z"/>
    </svg>
  );
}
