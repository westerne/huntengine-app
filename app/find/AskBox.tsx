'use client';

// Step 3 of Find a Hunt: the hunter says what he's after in his own words.
//
// This is the one place a model earns its keep — "two weeks in September, I
// shoot a bow, and I'd rather not see other trucks" is easy for a person to say
// and miserable to collect through dropdowns. The model only reads the sentence
// and picks from a closed list of keys; the matching, the ordering and every
// figure on the cards below come from the draw data.

import { useState } from 'react';
import { Button, Card } from '../ui';
import { Loader } from '../ui/client';

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
    <Card aria-labelledby="ask-h">
      <div className="hq-stack" style={{ gap: 12 }}>
        <div>
          <h2 id="ask-h" className="hq-h3">What are you looking for?</h2>
          <p className="hq-small" style={{ marginTop: 4 }}>
            Weapon, when you can get away, how far from a road, antlers or meat — say it however you&apos;d say it
            to a buddy. We&apos;ll match it against what the state actually published, and tell you which parts
            the draw data can&apos;t answer.
          </p>
        </div>
        <textarea
          aria-label="What you are looking for"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          rows={3}
          maxLength={600}
          placeholder={EXAMPLES[0]}
          className="hq-input"
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Examples">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              className="hq-chip"
              title={e}
              onClick={() => setText(e)}
              style={{ maxWidth: 'min(100%, 320px)', fontSize: 13 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Button type="button" onClick={submit} disabled={busy || disabled || text.trim().length < 3}>
            {busy ? 'Matching…' : 'Match these hunts'}
          </Button>
          <span className="hq-small">Or skip it — everything within reach is listed below.</span>
        </div>
        {busy && <Loader lines={['Reading what you said', 'Matching it against the draw results']} />}
      </div>
    </Card>
  );
}
