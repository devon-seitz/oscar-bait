import React from 'react';

export default function About() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold gold-text-gradient mb-8 text-center">
        About Oscar Bait
      </h1>

      <div className="space-y-6 text-oscar-white/80 font-sans leading-relaxed">
        <div className="gold-border rounded-lg p-6 bg-oscar-gold/5">
          <h2 className="font-serif text-xl font-semibold text-oscar-gold mb-3">How to Play</h2>
          <div className="space-y-4">
            <p>
              <strong className="text-oscar-gold">Rank your picks</strong> — Drag nominees to rank them in each category. Your #1 pick is who you think will win.
            </p>
            <div>
              <p className="mb-2">
                <strong className="text-oscar-gold">Scoring</strong> — The higher you rank the actual winner, the more points you earn.
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
            <p>
              <strong className="text-oscar-gold">Scouting Reports</strong> — Haven't seen everything? Tap the Scouting Report button on any category for quick takes on each nominee.
            </p>
            <p>
              <strong className="text-oscar-gold">On Oscar Night</strong> — When winners are announced live, a dramatic reveal plays for each category. The leaderboard shifts in real time — watch your rank climb as results come in.
            </p>
          </div>
        </div>

        <div className="gold-border rounded-lg p-6 bg-oscar-gold/5">
          <h2 className="font-serif text-xl font-semibold text-oscar-gold mb-3">The Origin Story</h2>
          <p>
            This is a game my family started back when we were young. Every year, we would watch the Oscars together and try to pick the winners.
          </p>
        </div>

        <div className="gold-border rounded-lg p-6 bg-oscar-gold/5">
          <h2 className="font-serif text-xl font-semibold text-oscar-gold mb-3">The Evolution</h2>
          <p>
            We've continued this tradition every year, and it's slowly evolved over time — from simply picking the winner, to a full points-based ranking system.
          </p>
        </div>

        <div className="gold-border rounded-lg p-6 bg-oscar-gold/5">
          <h2 className="font-serif text-xl font-semibold text-oscar-gold mb-3">Going Digital</h2>
          <p>
            I've always wanted to build this as a game, since my family is now spread all over the country, so that we could play together no matter where we are.
          </p>
        </div>

        <div className="gold-border rounded-lg p-6 bg-oscar-gold/5">
          <h2 className="font-serif text-xl font-semibold text-oscar-gold mb-3">Built with AI</h2>
          <p>
            This year, with the advances in AI, I thought it would be a fun exercise to vibe code the entire game. I did not write a single line of code (thanks Claude!), and it's been a really fun experience.
          </p>
        </div>

        <div className="text-center pt-4">
          <a
            href="https://github.com/devon-seitz/oscar-bait"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 gold-border rounded-lg text-oscar-gold hover:bg-oscar-gold/10 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Check out the GitHub repo
          </a>
        </div>
      </div>
    </div>
  );
}
