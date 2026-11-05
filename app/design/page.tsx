import { Binoculars, CalendarPlus } from 'lucide-react';
import {
  BigNumber, Button, ButtonLink, Card, Caveat, Confidence, EmptyState, Eyebrow, Lockup, Mark,
  PointsTimeline, StatRow, Tier,
} from '../ui';
import { Loader, TabBar, ThemeToggle } from '../ui/client';
import ChipDemo from './ChipDemo';

export const metadata = { title: 'Design system | HuntQuarters' };

// Living reference for the "Timber & Blaze" system (docs/BRAND.md). Every
// component here is the one the app's screens use.

const SWATCHES: Array<{ name: string; v: string; job: string }> = [
  { name: 'Timber', v: '--brand', job: 'HuntQuarters itself: the mark, selected states' },
  { name: 'Blaze', v: '--action', job: 'Only ever "tap this"' },
  { name: 'Data', v: '--data', job: 'Only ever a number' },
  { name: 'Good', v: '--good', job: 'Likely draw — always with the word' },
  { name: 'Fair', v: '--fair', job: 'Fair chance / caution' },
  { name: 'Long', v: '--long', job: 'Long shot / neutral info' },
  { name: 'Stop', v: '--stop', job: 'Closed to you, errors' },
  { name: 'Canvas', v: '--canvas', job: 'Page background' },
  { name: 'Surface', v: '--surface', job: 'Cards' },
  { name: 'Ink', v: '--ink', job: 'Text' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="hq" style={{ minHeight: '100vh', paddingBottom: 'calc(var(--tabbar-h) + 40px)' }}>
      <header className="hq-header">
        <Lockup size={28} />
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 'var(--col)', margin: '0 auto', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 36 }}>
        <div className="hq-fade-up">
          <Eyebrow>Design system</Eyebrow>
          <h1 className="hq-h1" style={{ marginTop: 6 }}>Timber &amp; Blaze</h1>
          <p className="hq-body" style={{ marginTop: 8 }}>One color, one job. Blaze means tap this. Data means a number. Timber is HuntQuarters. Odds colors always come with a word.</p>
        </div>

        {/* A real hunt, the new way — Oregon elk 210A2 at 6 points */}
        <Section title="Example: a hunt card">
          <Card className="hq-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <Eyebrow>Oregon · Elk · 2027</Eyebrow>
                <h2 className="hq-h2" style={{ marginTop: 4 }}>W Saddle Mtn No. 2</h2>
                <p className="hq-small">Unit 10 · Hunt 210A2 · Rifle</p>
              </div>
              <Tier tier="good" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 18 }}>
              <BigNumber value="100" unit="%" label="Drew at 6 points" sub="2026 draw" />
              <Confidence level={3} />
            </div>
            <div style={{ marginTop: 18 }}>
              <StatRow items={[
                { k: 'Hunter success', v: '88%', n: '2025' },
                { k: 'Public land', v: '~33%', n: 'BLM sample' },
                { k: 'Points needed', v: '6', n: 'last draw' },
              ]} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <Button><CalendarPlus size={18} aria-hidden="true" /> Add to my plan</Button>
              <Button variant="secondary"><Binoculars size={18} aria-hidden="true" /> Unit brief</Button>
            </div>
          </Card>
        </Section>

        <Section title="Points over time">
          <Card>
            <p className="hq-h3">Wyoming elk · Area 125</p>
            <p className="hq-small" style={{ marginBottom: 16 }}>You clear last draw&apos;s 5-point cutoff in 2029.</p>
            <PointsTimeline years={[2027, 2028, 2029, 2030, 2031]} points={{ 2027: 3, 2028: 4, 2029: 5, 2030: 0, 2031: 1 }} cutoff={5} drawYear={2029} />
          </Card>
        </Section>

        <Section title="Odds & confidence">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tier tier="good" /><Tier tier="fair" /><Tier tier="long" /><Tier tier="stop" />
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Confidence level={3} /><Confidence level={2} /><Confidence level={1} />
          </div>
        </Section>

        <Section title="Caveats — said once">
          <Caveat>Odds are last year&apos;s published results, not a forecast.</Caveat>
          <Caveat tone="warn">Oklahoma counts backup choices as applicants, so real odds are better than shown.</Caveat>
          <Caveat tone="stop">Residents only — South Dakota elk isn&apos;t open to non-residents.</Caveat>
        </Section>

        <Section title="Buttons & chips">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Remove</Button>
            <Button size="sm">Small</Button>
          </div>
          <ButtonLink href="/design" block>Full-width action</ButtonLink>
          <ChipDemo />
        </Section>

        <Section title="Type">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Eyebrow>Eyebrow · Mono 11</Eyebrow>
            <p className="hq-h1">Heading 1 · 30 / 800</p>
            <p className="hq-h2">Heading 2 · 21 / 800</p>
            <p className="hq-h3">Heading 3 · 16 / 700</p>
            <p className="hq-body">Body · 16 / 1.5 — plain, helpful, short.</p>
            <p className="hq-small">Small · 13 — secondary detail.</p>
            <p><span className="hq-data" style={{ fontSize: 18 }}>2027 · 6 pts · 88%</span> <span className="hq-small">— numbers in mono</span></p>
            <a className="hq-link" href="#top">A link is blaze</a>
          </div>
        </Section>

        <Section title="Color roles">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {SWATCHES.map((s) => (
              <div key={s.v} className="hq-card hq-card--flat" style={{ padding: 10 }}>
                <div style={{ height: 40, borderRadius: 8, background: `var(${s.v})`, border: '1px solid var(--border)' }} />
                <p className="hq-h3" style={{ marginTop: 8, fontSize: 14 }}>{s.name}</p>
                <p className="hq-small" style={{ fontSize: 12 }}>{s.job}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Empty & loading">
          <Card variant="flat">
            <EmptyState icon={<CalendarPlus size={24} />} title="Nothing planned for 2028 yet"
              text="Room for a draw target, a bucket-list hunt or an over-the-counter tag."
              action={<Button variant="secondary" size="sm">Add a hunt</Button>} />
          </Card>
          <Card variant="flat"><Loader /></Card>
        </Section>

        <Section title="Brand">
          <Card variant="brand" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Mark size={56} />
            <div>
              <Eyebrow>The mark</Eyebrow>
              <p style={{ fontWeight: 700 }}>A ridgeline under a rising blaze sun — first light on opening morning.</p>
            </div>
          </Card>
          <Lockup size={36} tagline />
        </Section>
      </main>

      <TabBar />
    </div>
  );
}
