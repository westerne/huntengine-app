'use client';

// Interactive pieces of the HuntQuarters UI kit.

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Search, Plus, Archive, User, Monitor, Sun, Moon } from 'lucide-react';

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
  { href: '/calendar', label: 'Plan', icon: CalendarRange, match: ['/calendar', '/season'] },
  { href: '/planner', label: 'Find', icon: Search, match: ['/planner', '/compare'] },
  { href: '/add', label: 'Add', icon: Plus, match: ['/add'], raised: true },
  { href: '/history', label: 'Hunts', icon: Archive, match: ['/history'] },
  { href: '/profile', label: 'Me', icon: User, match: ['/profile'] },
];

export function TabBar() {
  const path = usePathname() || '/';
  return (
    <nav className="hq-tabbar" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon, match, raised }) => {
        const on = match.some((m) => path.startsWith(m));
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

// ── Loader: a ridgeline draws in under a rising sun, with status lines ──────
export function Loader({ lines = ['Reading the draw results', 'Checking your points', 'Lining up the odds'] }: { lines?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 1800);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="hq-loader" role="status" aria-live="polite">
      <svg width="120" height="56" viewBox="0 0 120 56" aria-hidden="true">
        <circle className="hq-loader__sun" cx="80" cy="20" r="9" />
        <g className="hq-loader__ridge"><path d="M4 50 L30 22 L46 38 L64 14 L90 40 L104 30 L116 50" /></g>
      </svg>
      <p key={i} className="hq-loader__line">{lines[i]}…</p>
    </div>
  );
}
