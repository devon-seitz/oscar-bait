const API_BASE = process.env.REACT_APP_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  createPlayer: (name) => request('/api/players', { method: 'POST', body: JSON.stringify({ name }) }),
  getPlayers: () => request('/api/players'),
  submitPicks: (playerId, category, rankings) =>
    request(`/api/picks/${playerId}`, { method: 'POST', body: JSON.stringify({ category, rankings }) }),
  lockPicks: (playerId) => request(`/api/picks/${playerId}/lock`, { method: 'POST' }),
  getPicks: (playerId) => request(`/api/picks/${playerId}`),
  setWinner: (category, winner, passcode) =>
    request('/api/admin/winner', { method: 'POST', body: JSON.stringify({ category, winner, passcode }) }),
  clearWinner: (category, passcode) =>
    request('/api/admin/clear-winner', { method: 'POST', body: JSON.stringify({ category, passcode }) }),
  deletePlayer: (playerId, passcode) =>
    request('/api/admin/delete-player', { method: 'POST', body: JSON.stringify({ player_id: playerId, passcode }) }),
  getCategories: () => request('/api/categories'),
  getLeaderboard: () => request('/api/leaderboard'),
  getLatestAnnouncement: () => request('/api/announcements/latest'),
  verifyPasscode: (passcode) =>
    request('/api/admin/verify', { method: 'POST', body: JSON.stringify({ passcode }) }),
};
