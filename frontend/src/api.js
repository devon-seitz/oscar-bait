const API_BASE = process.env.REACT_APP_API_URL || '';

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

function getPlayerToken() {
  try {
    const p = JSON.parse(localStorage.getItem('oscar_bait_player'));
    return p?.token || '';
  } catch { return ''; }
}

export const api = {
  createPlayer: (name, password) => request('/api/players', { method: 'POST', body: JSON.stringify({ name, password }) }),
  getPlayers: () => request('/api/players'),
  submitPicks: (playerId, category, rankings) =>
    request(`/api/picks/${playerId}`, { method: 'POST', body: JSON.stringify({ category, rankings }), headers: { 'X-Player-Token': getPlayerToken() } }),
  lockPicks: (playerId) => request(`/api/picks/${playerId}/lock`, { method: 'POST', headers: { 'X-Player-Token': getPlayerToken() } }),
  getPicks: (playerId) => request(`/api/picks/${playerId}`),
  setWinner: (category, winner, passcode) =>
    request('/api/admin/winner', { method: 'POST', body: JSON.stringify({ category, winner, passcode }) }),
  clearWinner: (category, passcode) =>
    request('/api/admin/clear-winner', { method: 'POST', body: JSON.stringify({ category, passcode }) }),
  deletePlayer: (playerId, passcode) =>
    request('/api/admin/delete-player', { method: 'POST', body: JSON.stringify({ player_id: playerId, passcode }) }),
  resetPassword: (playerId, passcode) =>
    request('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ player_id: playerId, passcode }) }),
  getCategories: () => request('/api/categories'),
  getLeaderboard: () => request('/api/leaderboard'),
  getLatestAnnouncement: () => request('/api/announcements/latest'),
  verifyPasscode: (passcode) =>
    request('/api/admin/verify', { method: 'POST', body: JSON.stringify({ passcode }) }),
};
