'use client';

// Interactive pieces of the HuntQuarters UI kit.

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Search, Plus, User, Monitor, Sun, Moon } from 'lucide-react';

// ── Theme: auto (device) / light / dark, remembered per browser ─────────────
type Theme = 'auto' | 'light' | 'dark';
const KEY = 'hq-theme';

export function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.classList.remove('theme-light', 'theme-dark');
  if (t !== 'auto') el.classList.add(`theme-${t}`);
}

// The saved choice, read without a hydration mismatch (server always says "auto").
const listeners = new Set<() => void>();
const readTheme = (): Theme => {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; }
};
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'auto' as Theme);
  const pick = (t: Theme) => {
    applyTheme(t);
    try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* private mode */ }
    listeners.forEach((l) => l());
  };
  return (
    <div role="group" aria-label="Theme" className="hq-seg">
      {([['auto', Monitor, 'Match device'], ['light', Sun, 'Light'], ['dark', Moon, 'Dark']] as const).map(([t, Icon, label]) => (
        <button key={t} type="button" aria-pressed={theme === t} onClick={() => pick(t)} aria-label={label} title={label}>
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// ── Chip (toggle) ───────────────────────────────────────────────────────────
export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="hq-chip" aria-pressed={pressed} onClick={onClick}>{children}</button>;
}

// ── Bottom tab bar: follows the hunter's year ───────────────────────────────
const TABS = [
  { href: '/today', label: 'Today', icon: Sun, match: ['/today'] },
  { href: '/plan', label: 'Plan', icon: CalendarRange, match: ['/plan', '/calendar', '/season', '/history'] },
  { href: '/add', label: 'Add', icon: Plus, match: ['/add'], raised: true },
  { href: '/find', label: 'Find', icon: Search, match: ['/find', '/planner', '/compare'] },
  { href: '/profile', label: 'Me', icon: User, match: ['/profile'] },
];

export function TabBar() {
  const path = usePathname() || '/';
  return (
    <nav className="hq-tabbar" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon, match, raised }) => {
        const on = match.some((m) => path === m || path.startsWith(`${m}/`));
        return (
          <Link key={href} href={href} className={`hq-tab${raised ? ' hq-tab--raised' : ''}`} aria-current={on ? 'page' : undefined}>
            {raised ? <span className="hq-tab__fab"><Icon size={24} aria-hidden="true" /></span> : <Icon size={22} aria-hidden="true" />}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Loader: the mark's network of points links up, with status lines ──────
const NODES: Array<[number, number]> = [[14, 40], [34, 18], [56, 30], [80, 12], [100, 34], [66, 48], [40, 46]];
const LINKS: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 4], [1, 6], [6, 5], [0, 6]];
export function Loader({ lines = ['Reading the draw results', 'Checking your points', 'Lining up the odds'] }: { lines?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 1800);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="hq-loader" role="status" aria-live="polite">
      <svg width="120" height="60" viewBox="0 0 114 60" aria-hidden="true" className="hq-loader__net">
        {LINKS.map(([a, b], k) => (
          <line key={k} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} style={{ animationDelay: `${k * 0.12}s` }} />
        ))}
        {NODES.map(([x, y], k) => <circle key={k} cx={x} cy={y} r="4.5" style={{ animationDelay: `${k * 0.15}s` }} />)}
      </svg>
      <p key={i} className="hq-loader__line">{lines[i]}…</p>
    </div>
  );
}
