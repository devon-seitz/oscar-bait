import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import Home from './components/Home';
import Ballot from './components/Ballot';
import Leaderboard from './components/Leaderboard';
import Admin from './components/Admin';
import RevealOverlay from './components/RevealOverlay';
import OnboardingOverlay from './components/OnboardingOverlay';

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('admin_passcode'));
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

  const handleJoin = async (name, password) => {
    const p = await api.createPlayer(name, password);
    setPlayer(p);
    localStorage.setItem('oscar_bait_player', JSON.stringify(p));
    const onboardingKey = `oscar_bait_onboarding_seen_${p.id}`;
    if (!localStorage.getItem(onboardingKey)) {
      setShowOnboarding(true);
    }
    setPage('ballot');
  };

  const handleOnboardingDismiss = () => {
    setShowOnboarding(false);
    if (player) {
      localStorage.setItem(`oscar_bait_onboarding_seen_${player.id}`, 'true');
    }
  };

  const handleLogout = () => {
    setPlayer(null);
    setPicks({});
    localStorage.removeItem('oscar_bait_player');
    setPage('home');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_passcode');
    setIsAdmin(false);
    setPage(player ? 'ballot' : 'home');
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
      {showOnboarding && (
        <OnboardingOverlay onDismiss={handleOnboardingDismiss} />
      )}
      {activeReveal && (
        <RevealOverlay
          announcement={activeReveal}
          onDismiss={handleRevealDismiss}
          currentPlayerName={player?.name}
        />
      )}
      {/* Nav */}
      <nav className="border-b border-oscar-gold/20 bg-oscar-black/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <button onClick={() => setPage(player ? 'ballot' : 'home')} className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
            <img src="/logo.png" alt="Oscar Bait" className="w-5 h-7 sm:w-6 sm:h-8 object-contain" />
            <span className="font-serif text-lg sm:text-xl font-bold gold-text-gradient">Oscar Bait</span>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            {player && (
              <button
                onClick={() => setPage('ballot')}
                className={`px-2.5 sm:px-3 py-2 sm:py-2 rounded text-sm font-medium transition-colors min-h-[44px] flex items-center ${page === 'ballot' ? 'bg-oscar-gold/20 text-oscar-gold' : 'text-oscar-white/60 hover:text-oscar-white'}`}
              >
                Ballot
              </button>
            )}
            <button
              onClick={() => setPage('leaderboard')}
              className={`px-2.5 sm:px-3 py-2 sm:py-2 rounded text-sm font-medium transition-colors min-h-[44px] flex items-center ${page === 'leaderboard' ? 'bg-oscar-gold/20 text-oscar-gold' : 'text-oscar-white/60 hover:text-oscar-white'}`}
            >
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Board</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setPage('admin')}
                className={`px-2.5 sm:px-3 py-2 sm:py-2 rounded text-sm font-medium transition-colors min-h-[44px] flex items-center ${page === 'admin' ? 'bg-oscar-gold/20 text-oscar-gold' : 'text-oscar-white/60 hover:text-oscar-white'}`}
              >
                Admin
              </button>
            )}
            {player && (
              <button
                onClick={handleLogout}
                className="px-2.5 sm:px-3 py-2 rounded text-sm font-medium text-oscar-white/40 hover:text-oscar-white/70 transition-colors min-h-[44px] flex items-center"
              >
                <span className="hidden sm:inline">Switch Player</span>
                <span className="sm:hidden">Switch</span>
              </button>
            )}
            {isAdmin && !player && (
              <button
                onClick={handleAdminLogout}
                className="px-2.5 sm:px-3 py-2 rounded text-sm font-medium text-oscar-white/40 hover:text-oscar-white/70 transition-colors min-h-[44px] flex items-center"
              >
                Logout
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
        {page === 'admin' && <Admin categories={categories} onRefresh={refreshCategories} onAuthenticated={() => setIsAdmin(true)} />}
      </main>
    </div>
  );
}

