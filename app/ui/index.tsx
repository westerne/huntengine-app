// UI kit — brand-board design system (app/styles/hq.css, docs/BRAND.md).
// Server-safe building blocks; interactive pieces live in their own client files.

import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { MARK_PATHS, MARK_VIEWBOX } from './markPaths';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

// ── Brand ───────────────────────────────────────────────────────────────────
// The mark: the elk with its network of points, from the brand SVG. Drawn in
// --mark: Engine Slate on light, Field Gold on dark.
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg className="hq-mark" viewBox={MARK_VIEWBOX} width={Math.round(size * 0.8265)} height={size} aria-hidden="true">
      {MARK_PATHS.map((d, i) => <path key={i} d={d} fill="currentColor" />)}
    </svg>
  );
}

// Two-tone wordmark as on the board: first word in gold, the rest in Alpine Mist.
export const BRAND = { lead: 'Hunt', rest: 'Quarters' };

export function Lockup({ size = 28, tagline = false }: { size?: number; tagline?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }} aria-label={`${BRAND.lead}${BRAND.rest}`}>
      <Mark size={size * 1.3} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span className="hq-wordmark" style={{ fontSize: size * 0.62 }}><b>{BRAND.lead}</b>{BRAND.rest}</span>
        {tagline && <span className="hq-eyebrow" style={{ fontSize: 9 }}>Built for the hunt ahead</span>}
      </span>
    </span>
  );
}

// ── Type ────────────────────────────────────────────────────────────────────
export const Eyebrow = ({ children }: { children: ReactNode }) => <p className="hq-eyebrow">{children}</p>;

// ── Surfaces ────────────────────────────────────────────────────────────────
export function Card({ children, variant, className, style, as: Tag = 'section' }: {
  children: ReactNode; variant?: 'flat' | 'brand'; className?: string; style?: CSSProperties; as?: 'section' | 'div' | 'article' | 'li';
}) {
  return <Tag className={cx('hq-card', variant && `hq-card--${variant}`, className)} style={style}>{children}</Tag>;
}

// ── Buttons ─────────────────────────────────────────────────────────────────
type BtnProps = { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm'; block?: boolean };
export function Button({ variant = 'primary', size, block, className, ...rest }: BtnProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={cx('hq-btn', `hq-btn--${variant}`, size && `hq-btn--${size}`, block && 'hq-btn--block', className)} />;
}
export function ButtonLink({ href, variant = 'primary', size, block, children }: BtnProps & { href: string; children: ReactNode }) {
  return <Link href={href} className={cx('hq-btn', `hq-btn--${variant}`, size && `hq-btn--${size}`, block && 'hq-btn--block')}>{children}</Link>;
}

// ── Numbers ─────────────────────────────────────────────────────────────────
// The one number a screen is about (draw odds, points, success), shown big.
export function BigNumber({ value, unit, sub, label }: { value: ReactNode; unit?: string; sub?: ReactNode; label?: string }) {
  return (
    <div className="hq-big">
      {label && <span className="hq-eyebrow">{label}</span>}
      <span className="hq-big__value">{value}{unit && <span className="hq-big__unit">{unit}</span>}</span>
      {sub && <span className="hq-big__sub">{sub}</span>}
    </div>
  );
}

export function StatRow({ items }: { items: Array<{ k: string; v: ReactNode; n?: ReactNode }> }) {
  return (
    <div className="hq-stats" style={{ '--n': items.length } as CSSProperties}>
      {items.map((s) => (
        <div key={s.k} className="hq-stat">
          <span className="hq-stat__k">{s.k}</span>
          <span className="hq-stat__v">{s.v}</span>
          {s.n && <span className="hq-stat__n">{s.n}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Odds tiers & confidence (color always paired with words) ────────────────
export type TierKind = 'good' | 'fair' | 'long' | 'stop';
export const TIER_WORD: Record<TierKind, string> = { good: 'Likely draw', fair: 'Fair chance', long: 'Long shot', stop: 'Not open to you' };
export function Tier({ tier, children }: { tier: TierKind; children?: ReactNode }) {
  return <span className={`hq-tier hq-tier--${tier}`}>{children ?? TIER_WORD[tier]}</span>;
}

// How much to trust a number: 3 = agency results at each point level,
// 2 = overall draw rate, 1 = partial / rough.
export function Confidence({ level, label }: { level: 1 | 2 | 3; label?: string }) {
  const word = label ?? (level === 3 ? 'Solid data' : level === 2 ? 'Fair data' : 'Rough data');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} className="hq-small">
      <span className="hq-meter" data-level={level} aria-hidden="true"><span /><span /><span /></span>
      {word}
    </span>
  );
}

// ── Caveat: said once, in one place ─────────────────────────────────────────
export function Caveat({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'stop'; children: ReactNode }) {
  const Icon = tone === 'stop' ? OctagonAlert : tone === 'warn' ? AlertTriangle : Info;
  return (
    <div className={cx('hq-caveat', tone !== 'info' && `hq-caveat--${tone}`)} role={tone === 'stop' ? 'alert' : undefined}>
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

// ── Points timeline: your points by year against last draw's cutoff ─────────
export function PointsTimeline({ years, points, cutoff, drawYear }: {
  years: number[]; points: Record<number, number>; cutoff?: number | null; drawYear?: number | null;
}) {
  const max = Math.max(1, cutoff ?? 0, ...years.map((y) => points[y] ?? 0));
  const H = 80;
  const TOP = 40;
  const h = (n: number) => Math.max(6, Math.round((n / max) * H));
  return (
    <figure aria-label={`Projected points ${years.map((y) => `${y}: ${points[y]}`).join(', ')}${cutoff != null ? `; last draw took ${cutoff}` : ''}`}>
      {cutoff != null && <p className="hq-points__legend"><span aria-hidden="true" />Last draw took {cutoff} pts</p>}
      {/* Headroom above the tallest bar for its number and the Draw tag. */}
      <div className="hq-points__wrap" style={{ height: H + TOP }}>
        {cutoff != null && <div className="hq-points__cut" style={{ bottom: h(cutoff) }} />}
        <div className="hq-points" style={{ '--n': years.length, height: H + TOP } as CSSProperties}>
          {years.map((y) => {
            const n = points[y] ?? 0;
            return (
              <div key={y} className="hq-points__col">
                {drawYear === y && <span className="hq-points__tag">Draw</span>}
                <span className="hq-points__n">{n}</span>
                <span className="hq-points__bar" style={{ height: h(n) }} data-clears={cutoff != null && n >= cutoff} data-draw={drawYear === y} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="hq-points" style={{ '--n': years.length, marginTop: 6 } as CSSProperties}>
        {years.map((y) => <span key={y} className="hq-points__y" style={{ textAlign: 'center' }}>{y}</span>)}
      </div>
    </figure>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="hq-empty">
      <span className="hq-empty__icon" aria-hidden="true">{icon}</span>
      <p className="hq-h3">{title}</p>
      {text && <p className="hq-small" style={{ maxWidth: 340 }}>{text}</p>}
      {action}
    </div>
  );
}
