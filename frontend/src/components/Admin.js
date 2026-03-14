import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Admin({ categories, onRefresh, onAuthenticated }) {
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [setting, setSetting] = useState({});
  const [message, setMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const [deleting, setDeleting] = useState({});
  const [resetting, setResetting] = useState({});

  const refreshPlayers = async () => {
    try {
      const p = await api.getPlayers();
      setPlayers(p);
    } catch (e) { /* ignore */ }
  };

  // Try stored passcode
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_passcode');
    if (stored) { setPasscode(stored); setAuthenticated(true); onAuthenticated?.(); }
  }, []);

  useEffect(() => {
    if (authenticated) refreshPlayers();
  }, [authenticated]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      await api.verifyPasscode(passcode);
      setAuthenticated(true);
      sessionStorage.setItem('admin_passcode', passcode);
      onAuthenticated?.();
    } catch (err) {
      setMessage('Invalid passcode');
    }
  };

  const handleSetWinner = async (categoryName, winner) => {
    if (!window.confirm(`Announce "${winner}" for ${categoryName}? This will trigger the reveal on all players' screens.`)) return;
    setSetting(prev => ({ ...prev, [categoryName]: true }));
    setMessage('');
    try {
      await api.setWinner(categoryName, winner, passcode);
      setMessage(`Winner set: ${winner} for ${categoryName}`);
      onRefresh();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setSetting(prev => ({ ...prev, [categoryName]: false }));
  };

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] fade-in-up">
        <h1 className="font-serif text-3xl font-bold text-oscar-white mb-6">Admin Panel</h1>
        <form onSubmit={handleAuth} autoComplete="off" className="w-full max-w-xs space-y-4">
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter admin passcode"
            className="w-full px-4 py-3 bg-oscar-black gold-border rounded-lg text-oscar-white placeholder-oscar-white/30 focus:outline-none focus:border-oscar-gold text-center"
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            style={{WebkitTextSecurity: 'disc'}}
          />
          {message && <p className="text-red-400 text-sm text-center">{message}</p>}
          <button
            type="submit"
            className="w-full py-3 gold-gradient rounded-lg text-oscar-black font-semibold hover:opacity-90 transition-opacity"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <h1 className="font-serif text-3xl font-bold text-oscar-white mb-2">Admin Panel</h1>
      <p className="text-oscar-white/50 text-sm mb-6">Select the winner for each category as results come in.</p>

      {message && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-oscar-gold/10 text-oscar-gold text-sm border border-oscar-gold/20">
          {message}
        </div>
      )}

      {/* Player Management */}
      <div className="mb-8 gold-border rounded-lg p-4">
        <h2 className="font-serif text-xl font-semibold text-oscar-white mb-3">Players ({players.length})</h2>
        {players.length === 0 ? (
          <p className="text-oscar-white/40 text-sm">No players yet</p>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded bg-oscar-white/5">
                <span className="text-sm text-oscar-white/80">{p.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Reset password for "${p.name}"? They'll set a new password on their next login.`)) return;
                      setResetting(prev => ({ ...prev, [p.id]: true }));
                      try {
                        await api.resetPassword(p.id, passcode);
                        setMessage(`Password reset for: ${p.name}`);
                      } catch (err) {
                        setMessage(`Error: ${err.message}`);
                      }
                      setResetting(prev => ({ ...prev, [p.id]: false }));
                    }}
                    disabled={resetting[p.id]}
                    className="px-3 py-2 rounded text-sm font-medium text-oscar-gold/70 hover:bg-oscar-gold/10 transition-colors disabled:opacity-50 min-h-[44px] flex items-center"
                  >
                    {resetting[p.id] ? 'Resetting...' : 'Reset PW'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete "${p.name}" and all their picks?`)) return;
                      setDeleting(prev => ({ ...prev, [p.id]: true }));
                      try {
                        await api.deletePlayer(p.id, passcode);
                        setMessage(`Deleted player: ${p.name}`);
                        refreshPlayers();
                      } catch (err) {
                        setMessage(`Error: ${err.message}`);
                      }
                      setDeleting(prev => ({ ...prev, [p.id]: false }));
                    }}
                    disabled={deleting[p.id]}
                    className="px-3 py-2 rounded text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 min-h-[44px] flex items-center"
                  >
                    {deleting[p.id] ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.name} className="gold-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-semibold text-oscar-white">{cat.name}</h3>
              {cat.winner && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-oscar-gold bg-oscar-gold/10 px-2 py-1 rounded-full">
                    Winner: {cat.winner}
                  </span>
                  <button
                    onClick={async () => {
                      setSetting(prev => ({ ...prev, [cat.name]: true }));
                      try {
                        await api.clearWinner(cat.name, passcode);
                        setMessage(`Cleared winner for ${cat.name}`);
                        onRefresh();
                      } catch (err) {
                        setMessage(`Error: ${err.message}`);
                      }
                      setSetting(prev => ({ ...prev, [cat.name]: false }));
                    }}
                    disabled={setting[cat.name]}
                    className="text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                  >
                    Unpick
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              {cat.nominees.map(nominee => (
                <button
                  key={nominee}
                  onClick={() => handleSetWinner(cat.name, nominee)}
                  disabled={setting[cat.name]}
                  className={`w-full text-left px-4 py-3 rounded text-sm transition-colors min-h-[44px] ${
                    cat.winner === nominee
                      ? 'gold-gradient text-oscar-black font-semibold'
                      : 'bg-oscar-white/5 text-oscar-white/70 hover:bg-oscar-gold/10 hover:text-oscar-white'
                  } disabled:opacity-50`}
                >
                  {nominee}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
