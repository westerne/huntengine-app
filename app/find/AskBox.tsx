'use client';

// Step 3 of Find a Hunt: the hunter says what he's after in his own words.
//
// This is the one place a model earns its keep — "two weeks in September, I
// shoot a bow, and I'd rather not see other trucks" is easy for a person to say
// and miserable to collect through dropdowns. The model only reads the sentence
// and picks from a closed list of keys; the matching, the ordering and every
// figure on the cards below come from the draw data.

import { useState } from 'react';

const EXAMPLES = [
  'Two weeks off in September, I shoot a bow, and I want to hear bulls.',
  "Rifle, late season, somewhere hunters actually fill. Don't care about a big one.",
  'Meat in the freezer this year. Nearest thing I can actually draw.',
];

export default function AskBox({
  onAsk,
  busy,
  disabled,
}: {
  onAsk: (text: string) => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');

  const submit = () => {
    const t = text.trim();
    if (t.length >= 3 && !busy) onAsk(t);
  };

  return (
    <section aria-labelledby="ask-h" className="border border-zinc-800 rounded-2xl p-5 space-y-3">
      <h2 id="ask-h" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        What are you looking for?
      </h2>
      <p className="text-zinc-400 text-sm">
        Weapon, when you can get away, how far from a road, antlers or meat — say it however you&apos;d say it
        to a buddy. We&apos;ll match it against what the state actually published, and tell you which parts
        the draw data can&apos;t answer.
      </p>
      <textarea
        aria-label="What you are looking for"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        rows={3}
        maxLength={600}
        placeholder={EXAMPLES[0]}
        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-200 text-sm outline-none focus:border-amber-500 resize-y"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || disabled || text.trim().length < 3}
          className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600"
        >
          {busy ? 'Matching…' : 'Match these hunts'}
        </button>
        <span className="text-zinc-600 text-xs">Or skip it — everything within reach is listed below.</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setText(e)}
            className="text-left text-[11px] text-zinc-500 hover:text-amber-500 border border-zinc-800 rounded-lg px-3 py-1.5 max-w-xs truncate"
          >
            {e}
          </button>
        ))}
      </div>
    </section>
  );
}
