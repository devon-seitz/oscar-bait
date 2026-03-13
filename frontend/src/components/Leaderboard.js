import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

const TOTAL_CATEGORIES = 24;

// ─── Helper: movement arrow ────────────────────────────────────────
function MovementBadge({ currentRank, previousRank }) {
  if (previousRank == null) return null;
  const diff = previousRank - currentRank; // positive = moved up
  if (diff > 0) return <span className="text-green-400 text-xs font-bold ml-1">▲{diff}</span>;
  if (diff < 0) return <span className="text-red-400 text-xs font-bold ml-1">▼{Math.abs(diff)}</span>;
  return <span className="text-oscar-white/30 text-xs font-bold ml-1">—</span>;
}

// ─── Helper: rank badge styling ────────────────────────────────────
function rankBadgeClass(idx) {
  if (idx === 0) return 'gold-gradient text-oscar-black';
  if (idx === 1) return 'bg-[#A0A0A0] text-oscar-black';
  if (idx === 2) return 'bg-[#CD7F32] text-oscar-black';
  return 'bg-oscar-white/10 text-oscar-white/60';
}

function cardGlowClass(idx, hasScore) {
  if (!hasScore) return 'gold-border';
  if (idx === 0) return 'gold-border-bright glow-gold';
  if (idx === 1) return 'border border-[#A0A0A0]/50 glow-silver';
  if (idx === 2) return 'border border-[#CD7F32]/50 glow-bronze';
  return 'gold-border';
}

// ─── Stats Bar ─────────────────────────────────────────────────────
function StatsBar({ data, announcedCount, totalCategories }) {
  if (data.length < 2 || announcedCount === 0) return null;

  // Closest race: smallest gap between adjacent players
  let closestGap = Infinity, closestPair = null;
  for (let i = 0; i < data.length - 1; i++) {
    const gap = data[i].total_score - data[i + 1].total_score;
    if (gap < closestGap) {
      closestGap = gap;
      closestPair = [data[i].name, data[i + 1].name];
    }
  }

  // Biggest lead: largest gap between adjacent players
  let biggestGap = 0, biggestLeader = null, biggestTrailer = null;
  for (let i = 0; i < data.length - 1; i++) {
    const gap = data[i].total_score - data[i + 1].total_score;
    if (gap > biggestGap) {
      biggestGap = gap;
      biggestLeader = data[i].name;
      biggestTrailer = data[i + 1].name;
    }
  }

  return (
    <div className="gold-border rounded-lg px-4 py-3 mb-6 grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-oscar-white/40 text-xs uppercase tracking-wider mb-1">Winners Announced</div>
        <div className="font-serif text-xl font-bold text-oscar-gold">{announcedCount} / {totalCategories}</div>
      </div>
      <div>
        <div className="text-oscar-white/40 text-xs uppercase tracking-wider mb-1">Closest Race</div>
        {closestPair ? (
          <>
            <div className="text-sm text-oscar-white font-medium">{closestPair[0]} vs {closestPair[1]}</div>
            <div className="text-xs text-oscar-gold">
              {closestGap === 0 ? '🔗 TIED' : `↕ ${closestGap} pt${closestGap !== 1 ? 's' : ''}`}
            </div>
          </>
        ) : <div className="text-sm text-oscar-white/40">—</div>}
      </div>
      <div>
        <div className="text-oscar-white/40 text-xs uppercase tracking-wider mb-1">Biggest Lead</div>
        {biggestLeader && biggestGap > 0 ? (
          <>
            <div className="text-sm text-oscar-white font-medium">{biggestLeader} (+{biggestGap})</div>
            <div className="text-xs text-oscar-white/50">over {biggestTrailer}</div>
          </>
        ) : <div className="text-sm text-oscar-white/40">—</div>}
      </div>
    </div>
  );
}

// ─── Gap Indicator ─────────────────────────────────────────────────
function GapIndicator({ scoreAbove, scoreBelow }) {
  const gap = scoreAbove - scoreBelow;
  if (gap === 0) {
    return <div className="text-center py-0.5"><span className="text-xs text-oscar-gold font-medium">🔗 TIED</span></div>;
  }
  return (
    <div className="text-center py-0.5">
      <span className="text-xs text-oscar-white/25">↕ {gap} pt{gap !== 1 ? 's' : ''}</span>
    </div>
  );
}

// ─── Player Summary Row (below the main name/score line) ───────────
function PlayerSummary({ player }) {
  const parts = [];

  if (player.best_pick) {
    parts.push(
      <span key="best" className="text-oscar-white/50">
        Best: <span className="text-oscar-white/70">{player.best_pick.category}</span>
        <span className="text-oscar-gold ml-1">(#{player.best_pick.rank} = {player.best_pick.points}pt)</span>
      </span>
    );
  }
  if (player.worst_pick && player.best_pick && player.worst_pick.category !== player.best_pick.category) {
    parts.push(
      <span key="worst" className="text-oscar-white/50">
        Worst: <span className="text-oscar-white/70">{player.worst_pick.category}</span>
        <span className="text-oscar-white/40 ml-1">(#{player.worst_pick.rank} = {player.worst_pick.points}pt)</span>
      </span>
    );
  }

  const extras = [];
  if (player.perfect_picks > 0) extras.push(`${player.perfect_picks} perfect`);
  if (player.categories_total > 0) extras.push(`${player.categories_scored}/${player.categories_total} scored`);
  if (player.win_streak >= 2) extras.push(`🔥 ${player.win_streak} streak`);

  return (
    <div className="text-xs space-y-0.5 mt-0.5">
      {parts.map((p, i) => <div key={i}>{p}</div>)}
      {extras.length > 0 && (
        <div className="text-oscar-white/40">{extras.join('  ·  ')}</div>
      )}
    </div>
  );
}

// ─── Expanded Detail Table ─────────────────────────────────────────
function ExpandedDetail({ player, categories }) {
  const detail = player.picks_detail;
  if (!detail) return null;

  const announced = categories.filter(c => c.winner);
  const unannounced = categories.filter(c => !c.winner);

  return (
    <div className="px-4 pb-4 pt-1 border-t border-oscar-gold/10">
      {announced.length === 0 ? (
        <p className="text-oscar-white/40 text-sm py-2">No winners announced yet</p>
      ) : (
        <div className="mt-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-1 text-xs text-oscar-white/30 uppercase tracking-wider px-2 pb-1 mb-1 border-b border-oscar-white/5">
            <div className="col-span-3">Category</div>
            <div className="col-span-3">Your Pick</div>
            <div className="col-span-3">Winner</div>
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-2 text-right">Pts</div>
          </div>

          {/* Announced categories */}
          {announced.map(cat => {
            const d = detail[cat.name];
            if (!d) return null;
            const isCorrect = d.pick === d.winner;
            const noPick = !d.has_picks;
            const rank1 = d.rank === 1;

            return (
              <div
                key={cat.name}
                className={`grid grid-cols-12 gap-1 items-center py-1.5 px-2 rounded text-sm ${
                  rank1 ? 'bg-oscar-gold/10' : noPick ? 'opacity-40' : 'bg-oscar-white/5'
                }`}
              >
                <div className="col-span-3 text-oscar-white/70 truncate text-xs">{cat.name}</div>
                <div className="col-span-3 truncate text-xs">
                  {noPick ? (
                    <span className="text-oscar-white/30">—</span>
                  ) : (
                    <span className="text-oscar-white/80">{d.full_rankings?.[0] || '—'}</span>
                  )}
                </div>
                <div className="col-span-3 truncate text-xs">
                  <span className="text-oscar-white/80">{d.winner}</span>
                  {d.has_picks && (
                    isCorrect
                      ? <span className="text-green-400 ml-1">✓</span>
                      : <span className="text-red-400/60 ml-1">✗</span>
                  )}
                </div>
                <div className="col-span-1 text-center text-xs text-oscar-white/50">
                  {d.rank ? `#${d.rank}` : '—'}
                </div>
                <div className={`col-span-2 text-right text-xs font-semibold ${
                  rank1 ? 'text-oscar-gold' : d.points > 0 ? 'text-oscar-white/70' : 'text-oscar-white/30'
                }`}>
                  {d.points != null ? `+${d.points}` : '—'}
                </div>
              </div>
            );
          })}

          {/* Unannounced categories */}
          {unannounced.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-oscar-white/20 uppercase tracking-wider mb-1 px-2">Pending</div>
              {unannounced.map(cat => {
                const d = detail[cat.name];
                return (
                  <div key={cat.name} className="grid grid-cols-12 gap-1 items-center py-1 px-2 text-xs opacity-30">
                    <div className="col-span-3 truncate">{cat.name}</div>
                    <div className="col-span-3">{d?.has_picks ? 'Locked' : '—'}</div>
                    <div className="col-span-3">—</div>
                    <div className="col-span-1 text-center">—</div>
                    <div className="col-span-2 text-right">—</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Final Standings Header ────────────────────────────────────────
function FinalStandingsHeader({ winner }) {
  return (
    <div className="text-center mb-8">
      <div className="font-serif text-4xl font-bold gold-text-gradient mb-2">🏆 Final Standings</div>
      <p className="text-oscar-white/60">
        All {TOTAL_CATEGORIES} categories announced — <span className="text-oscar-gold font-semibold">{winner.name}</span> wins with {winner.total_score} points!
      </p>
    </div>
  );
}

// ─── Game Summary (end-of-night stats) ─────────────────────────────
function GameSummary({ data, categories }) {
  const announced = categories.filter(c => c.winner);
  if (announced.length === 0) return null;

  // Hardest category: lowest average rank across players for the winner
  // Easiest category: highest average rank (most #1 picks)
  let hardest = null, easiest = null;
  let hardestAvg = 0, easiestAvg = Infinity;

  for (const cat of announced) {
    let totalRank = 0, count = 0;
    for (const player of data) {
      const score = player.category_scores[cat.name];
      if (score?.rank) {
        totalRank += score.rank;
        count++;
      }
    }
    if (count > 0) {
      const avg = totalRank / count;
      if (avg > hardestAvg) { hardestAvg = avg; hardest = cat.name; }
      if (avg < easiestAvg) { easiestAvg = avg; easiest = cat.name; }
    }
  }

  // Bold Call: player with most solo #1 picks (only one to rank winner #1)
  let boldCallPlayer = null, boldCallCount = 0;
  for (const player of data) {
    let soloCount = 0;
    for (const cat of announced) {
      const myScore = player.category_scores[cat.name];
      if (myScore?.rank !== 1) continue;
      // Check if anyone else also had #1
      const othersHad1 = data.some(p => p.player_id !== player.player_id && p.category_scores[cat.name]?.rank === 1);
      if (!othersHad1) soloCount++;
    }
    if (soloCount > boldCallCount) {
      boldCallCount = soloCount;
      boldCallPlayer = player.name;
    }
  }

  return (
    <div className="gold-border rounded-lg p-4 mt-6">
      <h3 className="font-serif text-lg font-bold text-oscar-gold mb-3">Game Summary</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {hardest && (
          <div>
            <div className="text-oscar-white/40 text-xs uppercase mb-0.5">Hardest Category</div>
            <div className="text-oscar-white">{hardest}</div>
            <div className="text-oscar-white/40 text-xs">Avg rank: {hardestAvg.toFixed(1)}</div>
          </div>
        )}
        {easiest && (
          <div>
            <div className="text-oscar-white/40 text-xs uppercase mb-0.5">Easiest Category</div>
            <div className="text-oscar-white">{easiest}</div>
            <div className="text-oscar-white/40 text-xs">Avg rank: {easiestAvg.toFixed(1)}</div>
          </div>
        )}
        {hardest && (
          <div>
            <div className="text-oscar-white/40 text-xs uppercase mb-0.5">Biggest Upset</div>
            <div className="text-oscar-white">{hardest}</div>
          </div>
        )}
        {boldCallPlayer && boldCallCount > 0 && (
          <div>
            <div className="text-oscar-white/40 text-xs uppercase mb-0.5">Bold Call Award</div>
            <div className="text-oscar-white">{boldCallPlayer}</div>
            <div className="text-oscar-white/40 text-xs">{boldCallCount} solo #1 pick{boldCallCount !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Indicator ────────────────────────────────────────────────
function LiveIndicator({ isLive }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 live-dot' : 'bg-oscar-white/20'}`} />
      <span className={`text-xs ${isLive ? 'text-green-400' : 'text-oscar-white/30'}`}>
        {isLive ? 'Live' : 'Paused'}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Main Leaderboard Component ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function Leaderboard({ data: initialData, categories, currentPlayerName }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [data, setData] = useState(initialData);
  const [isLive, setIsLive] = useState(true);
  const [flashIds, setFlashIds] = useState(new Set());
  const prevDataRef = useRef(null);

  // Sync with prop data
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Auto-polling every 10 seconds
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const lb = await api.getLeaderboard();
        // Detect changes for flash animation
        if (prevDataRef.current) {
          const changed = new Set();
          for (const player of lb) {
            const prev = prevDataRef.current.find(p => p.player_id === player.player_id);
            if (!prev || prev.total_score !== player.total_score) {
              changed.add(player.player_id);
            }
          }
          if (changed.size > 0) {
            setFlashIds(changed);
            setTimeout(() => setFlashIds(new Set()), 1300);
          }
        }
        prevDataRef.current = lb;
        setData(lb);
      } catch (e) { console.error(e); }
    }, 10000);
    return () => clearInterval(interval);
  }, [isLive]);

  const announcedCategories = categories.filter(c => c.winner);
  const isFinal = announcedCategories.length >= TOTAL_CATEGORIES && data.length > 0;

  // Trigger confetti on final standings first load
  const confettiFired = useRef(false);
  useEffect(() => {
    if (isFinal && !confettiFired.current && window.confetti) {
      confettiFired.current = true;
      window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.3 }, colors: ['#C5A44E', '#D4B96A', '#E8D5A8'] });
    }
  }, [isFinal]);

  return (
    <div className="fade-in-up">
      {/* Header */}
      {isFinal ? (
        <FinalStandingsHeader winner={data[0]} />
      ) : (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-oscar-white">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator isLive={isLive} />
            <button
              onClick={() => setIsLive(prev => !prev)}
              className="px-3 py-1.5 text-xs gold-border rounded-lg text-oscar-white/50 hover:bg-oscar-gold/10 transition-colors"
            >
              {isLive ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar data={data} announcedCount={announcedCategories.length} totalCategories={TOTAL_CATEGORIES} />

      {/* Player List */}
      {data.length === 0 ? (
        <div className="text-center py-16 text-oscar-white/40">
          <p className="font-serif text-xl mb-2">No players yet</p>
          <p className="text-sm">Waiting for players to join...</p>
        </div>
      ) : (
        <div className="space-y-0">
          {data.map((player, idx) => {
            const isExpanded = expandedPlayer === player.player_id;
            const isTop3 = idx < 3;
            const hasScore = player.total_score > 0;
            const isFlashing = flashIds.has(player.player_id);
            const isCurrentPlayer = currentPlayerName && player.name === currentPlayerName;

            return (
              <React.Fragment key={player.player_id}>
                {/* Gap indicator between cards */}
                {idx > 0 && (
                  <GapIndicator scoreAbove={data[idx - 1].total_score} scoreBelow={player.total_score} />
                )}

                <div
                  className={`rounded-lg overflow-hidden transition-all ${cardGlowClass(idx, hasScore)} ${
                    isFlashing ? 'card-flash' : ''
                  } ${isFinal && idx === 0 ? 'final-winner-card' : ''}`}
                >
                  <button
                    onClick={() => setExpandedPlayer(isExpanded ? null : player.player_id)}
                    className="w-full text-left px-4 py-3 hover:bg-oscar-gold/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankBadgeClass(idx)}`}>
                        {idx + 1}
                      </span>

                      {/* Name + movement + summary */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          {idx === 0 && hasScore && <span className="mr-1">🏆</span>}
                          <span className={`font-medium truncate ${
                            isCurrentPlayer ? 'text-oscar-gold' : isTop3 ? 'text-oscar-white' : 'text-oscar-white/80'
                          }`}>
                            {player.name}
                          </span>
                          <MovementBadge currentRank={idx + 1} previousRank={player.previous_rank} />
                        </div>
                        {announcedCategories.length > 0 && <PlayerSummary player={player} />}
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <span className={`font-serif text-2xl font-bold ${
                            idx === 0 && hasScore ? 'gold-text-gradient' : 'text-oscar-white/80'
                          }`}>
                            {player.total_score}
                          </span>
                          <span className="text-oscar-white/30 text-xs ml-1">pts</span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-oscar-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 24 24" fill="currentColor"
                        >
                          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && <ExpandedDetail player={player} categories={categories} />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Game Summary (final mode only) */}
      {isFinal && <GameSummary data={data} categories={categories} />}
    </div>
  );
}
