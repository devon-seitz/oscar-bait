import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import SortableNominee from './SortableNominee';
import { unlockAudio } from '../sounds';

export default function Ballot({ categories, picks, leaderboard, player, onSubmitPick }) {
  const [openCategory, setOpenCategory] = useState(null);
  const [localRankings, setLocalRankings] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [celebratingCats, setCelebratingCats] = useState({});
  const categoryRefs = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getRankings = useCallback((categoryName, nominees) => {
    if (localRankings[categoryName]) return localRankings[categoryName];
    if (picks[categoryName]?.rankings) return picks[categoryName].rankings;
    return [...nominees];
  }, [localRankings, picks]);

  const completedCount = categories.filter(cat =>
    picks[cat.name]?.rankings?.length > 0
  ).length;

  // Compute personal score stats from leaderboard data
  const myEntry = leaderboard.find(e => e.player_id === player?.id);
  const myScore = myEntry?.total_score || 0;
  const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null;
  const leader = leaderboard.length > 0 ? leaderboard[0] : null;
  const announcedCategories = categories.filter(c => c.winner);
  const pointsPossible = announcedCategories.reduce((sum, c) => sum + c.nominees.length, 0);

  const isInFirst = myEntry && leader && myEntry.player_id === leader.player_id;
  const pointsBehind = leader && myEntry && !isInFirst ? leader.total_score - myScore : 0;

  // Track score changes for glow animation
  const prevScoreRef = useRef(myScore);
  const [scoreGlow, setScoreGlow] = useState(false);
  useEffect(() => {
    if (myScore !== prevScoreRef.current && prevScoreRef.current !== undefined) {
      setScoreGlow(true);
      const timer = setTimeout(() => setScoreGlow(false), 2000);
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = myScore;
  }, [myScore]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const handler = () => { unlockAudio(); window.removeEventListener('click', handler); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Detect new winner announcements for visual celebration — only reacts to category changes (polling)
  const prevWinnersRef = useRef(null); // null = not yet initialized
  useEffect(() => {
    const currentWinners = {};
    categories.forEach(c => { if (c.winner) currentWinners[c.name] = c.winner; });

    if (prevWinnersRef.current === null) {
      // First load — snapshot current state, don't play sounds
      prevWinnersRef.current = currentWinners;
      return;
    }

    const newlyAnnounced = [];
    for (const [catName] of Object.entries(currentWinners)) {
      if (!prevWinnersRef.current[catName]) {
        newlyAnnounced.push(catName);
      }
    }

    if (newlyAnnounced.length > 0) {
      setCelebratingCats(prev => {
        const next = { ...prev };
        newlyAnnounced.forEach(c => { next[c] = true; });
        return next;
      });
      // Clear celebration state after animation completes
      setTimeout(() => {
        setCelebratingCats(prev => {
          const next = { ...prev };
          newlyAnnounced.forEach(c => { delete next[c]; });
          return next;
        });
      }, 3000);
    }

    prevWinnersRef.current = currentWinners;
  }, [categories]); // only categories — not picks

  // Compute points earned per category for this player
  const getCategoryPoints = (cat) => {
    if (!cat.winner || !picks[cat.name]?.rankings) return null;
    const rankings = picks[cat.name].rankings;
    const idx = rankings.indexOf(cat.winner);
    if (idx === -1) return 0;
    return cat.nominees.length - idx;
  };

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = (event, categoryName, nominees) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = getRankings(categoryName, nominees);
    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    setLocalRankings(prev => ({ ...prev, [categoryName]: newItems }));

    // Auto-save
    setSaving(prev => ({ ...prev, [categoryName]: true }));
    onSubmitPick(categoryName, newItems)
      .then(() => setSaving(prev => ({ ...prev, [categoryName]: false })))
      .catch(() => setSaving(prev => ({ ...prev, [categoryName]: false })));
  };

  const handleSaveCategory = async (categoryName, nominees) => {
    const rankings = getRankings(categoryName, nominees);
    setSaving(prev => ({ ...prev, [categoryName]: true }));
    try {
      await onSubmitPick(categoryName, rankings);
      setSaved(prev => ({ ...prev, [categoryName]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [categoryName]: false })), 2000);
    } catch (e) { /* ignore */ }
    setSaving(prev => ({ ...prev, [categoryName]: false }));
  };


  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-oscar-white mb-2">Your Ballot</h1>
        <p className="text-oscar-white/50 text-sm">
          Drag to rank nominees in each category. #1 = most likely to win.
        </p>
      </div>

      {/* Mini Scoreboard */}
      {announcedCategories.length > 0 && (
        <div className="mb-6 gold-border rounded-lg p-3 sm:p-4 bg-oscar-gold/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-oscar-white/40 mb-1">Points Earned</p>
              <p className={`font-serif text-xl sm:text-2xl font-bold transition-all duration-500 ${
                scoreGlow ? 'gold-shimmer score-glow' : 'gold-text-gradient'
              }`}>{myScore}</p>
            </div>
            <div>
              <p className="text-xs text-oscar-white/40 mb-1">Points Possible</p>
              <p className="font-serif text-xl sm:text-2xl font-bold text-oscar-white/70">{pointsPossible}</p>
            </div>
            <div>
              <p className="text-xs text-oscar-white/40 mb-1">Your Rank</p>
              <p className="font-serif text-xl sm:text-2xl font-bold text-oscar-white/70">
                {myRank ? `#${myRank}` : '—'}
                <span className="text-sm font-sans text-oscar-white/30 ml-1">/ {leaderboard.length}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-oscar-white/40 mb-1">
                {isInFirst ? 'In First' : leader ? 'Leader' : 'In First'}
              </p>
              {leader ? (
                isInFirst ? (
                  <p className="font-serif text-lg font-bold text-oscar-gold truncate flex items-center gap-1.5">
                    <svg className="w-5 h-5 text-oscar-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 15c-3.31 0-6-2.69-6-6V3h12v6c0 3.31-2.69 6-6 6zm8-12h-2v6c0 1.1-.22 2.15-.62 3.11.92-.55 1.62-1.57 1.62-2.73V5c0-.55-.45-1-1-1zm-14 0H4c-.55 0-1 .45-1 1v1.38c0 1.16.7 2.18 1.62 2.73C4.22 8.15 4 7.1 4 6V3zm4 15v2H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2c3.95-.49 7-3.85 7-7.9V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4.1c0 4.05 3.05 7.41 7 7.9z"/>
                    </svg>
                    You!
                    <span className="text-sm font-sans text-oscar-white/40 ml-1">({myScore} pts)</span>
                  </p>
                ) : (
                  <div>
                    <p className="font-serif text-lg font-bold text-oscar-gold truncate flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-oscar-gold/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 15c-3.31 0-6-2.69-6-6V3h12v6c0 3.31-2.69 6-6 6zm8-12h-2v6c0 1.1-.22 2.15-.62 3.11.92-.55 1.62-1.57 1.62-2.73V5c0-.55-.45-1-1-1zm-14 0H4c-.55 0-1 .45-1 1v1.38c0 1.16.7 2.18 1.62 2.73C4.22 8.15 4 7.1 4 6V3zm4 15v2H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2v-2c3.95-.49 7-3.85 7-7.9V3c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4.1c0 4.05 3.05 7.41 7 7.9z"/>
                      </svg>
                      {leader.name}
                    </p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      {pointsBehind} pt{pointsBehind !== 1 ? 's' : ''} ahead of you
                    </p>
                  </div>
                )
              ) : (
                <p className="font-serif text-lg text-oscar-white/30">—</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-oscar-white/60">{completedCount} of {categories.length} categories ranked</span>
        </div>
        <div className="h-1.5 bg-oscar-white/10 rounded-full overflow-hidden">
          <div
            className="h-full gold-gradient rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / Math.max(categories.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const isOpen = openCategory === cat.name;
          const hasPicks = picks[cat.name]?.rankings?.length > 0;
          const rankings = getRankings(cat.name, cat.nominees);
          const isSaving = saving[cat.name];

          const isCelebrating = celebratingCats[cat.name];
          const catPoints = getCategoryPoints(cat);

          return (
            <div key={cat.name} ref={el => categoryRefs.current[cat.name] = el} style={{ scrollMarginTop: '60px' }} className={`rounded-lg overflow-hidden transition-all ${
              isCelebrating ? 'card-celebrate gold-border-bright' : 'gold-border'
            }`}>
              {/* Category header */}
              <button
                onClick={() => {
                  const opening = !isOpen;
                  setOpenCategory(isOpen ? null : cat.name);
                  if (opening) {
                    setTimeout(() => {
                      categoryRefs.current[cat.name]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-oscar-gold/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {cat.winner ? (
                      <span className="w-3 h-3 rounded-full flex-shrink-0 gold-gradient shadow-[0_0_6px_rgba(197,164,78,0.4)]" />
                    ) : hasPicks ? (
                      <span className="w-3 h-3 rounded-full flex-shrink-0 gold-gradient opacity-80" />
                    ) : (
                      <span className="w-3 h-3 rounded-full flex-shrink-0 border border-oscar-white/20" />
                    )}
                    <span className="font-serif text-base sm:text-lg font-semibold text-oscar-white text-left truncate">{cat.name}</span>
                  </div>
                  {cat.winner && (
                    <div className="flex items-center gap-2 mt-1 ml-5 sm:ml-6">
                      <span className={`text-xs text-oscar-gold bg-oscar-gold/10 px-2 py-0.5 rounded-full truncate ${
                        isCelebrating ? 'badge-slide-in' : ''
                      }`}>
                        {cat.winner}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isCelebrating ? 'points-count-up' : ''
                      } ${
                        catPoints === cat.nominees.length
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-oscar-white/10 text-oscar-white/50'
                      }`}>
                        {isCelebrating ? (
                          <AnimatedPoints target={catPoints ?? 0} />
                        ) : (
                          `+${catPoints ?? 0} pts`
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isSaving && <span className="text-xs text-oscar-gold/50">Saving...</span>}
                  <svg
                    className={`w-5 h-5 text-oscar-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                  </svg>
                </div>
              </button>

              {/* Nominees list */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-oscar-gold/10">
                  <p className="text-xs text-oscar-white/40 mb-3">
                    {cat.nominees.length} nominees — top pick earns {cat.nominees.length} pts
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={(e) => handleDragEnd(e, cat.name, cat.nominees)}
                  >
                    <SortableContext items={rankings} strategy={verticalListSortingStrategy}>
                      {rankings.map((nominee, index) => (
                        <SortableNominee
                          key={nominee}
                          id={nominee}
                          index={index}
                          totalNominees={cat.nominees.length}
                          disabled={false}
                        />
                      ))}
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-oscar-black gold-border-bright drag-overlay">
                          <span className="text-sm text-oscar-white">{activeId}</span>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                  {(
                    <button
                      type="button"
                      data-1p-ignore
                      onClick={() => handleSaveCategory(cat.name, cat.nominees)}
                      disabled={isSaving}
                      className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold transition-all gold-border-bright text-oscar-gold hover:bg-oscar-gold/10 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : saved[cat.name] ? '✓ Saved' : 'Save Picks'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedPoints({ target }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const duration = 800;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    // Delay the count-up to sync with the slide-in animation
    const timeout = setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick);
    }, 600);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return <>{`+${display} pts`}</>;
}
