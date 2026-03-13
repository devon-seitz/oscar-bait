import React from 'react';

export default function About() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold gold-text-gradient mb-8 text-center">
        About Oscar Bait
      </h1>

      <div className="space-y-6 text-oscar-white/80 font-sans leading-relaxed">
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
