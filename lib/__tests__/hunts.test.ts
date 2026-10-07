import { describe, expect, it } from 'vitest';
import { applyChange, canMove, currentSeasonYear, nextAction } from '../hunts';
import { isActiveStatus } from '../membership';
import { prefillFromAccount, savePayload } from '../../app/planner/account';
import { INITIAL_PROFILE } from '../../app/planner/types';

describe('saved-hunt lifecycle', () => {
  it('Considering → Planned → Applied starts a pending result', () => {
    expect(applyChange({ status: 'considering', application_result: null }, { status: 'planned' })).toEqual({ status: 'planned', application_result: null });
    expect(applyChange({ status: 'planned', application_result: null }, { status: 'applied' })).toEqual({ status: 'applied', application_result: 'pending' });
  });

  it('an unsuccessful draw stays Applied (kept in history) and points to finding another hunt', () => {
    const r = applyChange({ status: 'applied', application_result: 'pending' }, { application_result: 'unsuccessful' });
    expect(r).toEqual({ status: 'applied', application_result: 'unsuccessful' });
    expect(nextAction(r as never).label).toBe('Find another hunt');
  });

  it('a successful draw moves the hunt to Tag secured and offers the hunt plan', () => {
    const r = applyChange({ status: 'applied', application_result: 'pending' }, { application_result: 'successful' });
    expect(r).toEqual({ status: 'tag_secured', application_result: 'successful' });
    expect(nextAction(r as never)).toEqual({ label: 'Start your hunt plan', to: 'preparing' });
  });

  it('rejects impossible moves and results before applying', () => {
    expect(applyChange({ status: 'considering', application_result: null }, { status: 'completed' })).toHaveProperty('error');
    expect(applyChange({ status: 'planned', application_result: null }, { application_result: 'successful' })).toHaveProperty('error');
    expect(canMove('completed', 'considering')).toBe(false);
    expect(canMove('archived', 'considering')).toBe(true);
  });

  it('un-archiving a hunt that had a draw result works and clears the old result', () => {
    expect(applyChange({ status: 'archived', application_result: 'successful' }, { status: 'considering' }))
      .toEqual({ status: 'considering', application_result: null });
  });

  it('season year rolls to next year from July', () => {
    expect(currentSeasonYear(new Date('2026-03-01'))).toBe(2026);
    expect(currentSeasonYear(new Date('2026-10-06'))).toBe(2027);
  });
});

describe('membership status', () => {
  it('active, trialing and past_due grant access; canceled and none do not', () => {
    expect(isActiveStatus('active')).toBe(true);
    expect(isActiveStatus('past_due')).toBe(true);
    expect(isActiveStatus('canceled')).toBe(false);
    expect(isActiveStatus('none')).toBe(false);
    expect(isActiveStatus(null)).toBe(false);
    // Long-expired periods don't count even if the status lagged.
    expect(isActiveStatus('active', '2020-01-01T00:00:00Z')).toBe(false);
  });
});

describe('planner ↔ account', () => {
  const me = {
    accounts: true as const, signedIn: true as const, member: true as const,
    profile: { home_state: 'AZ', species_interests: ['Elk'], weapons: ['Archery'], fitness: 'Elite', grizzly_ok: false },
    points: [{ state: 'AZ', species: 'Elk', points: 7 }, { state: 'WY', species: 'Elk', points: 3 }, { state: 'WY', species: 'Mule Deer', points: 9 }],
  };

  it('prefills from the saved profile and points; residency only in the home state', () => {
    const p = prefillFromAccount(INITIAL_PROFILE, me);
    expect(p).toMatchObject({ states: ['AZ'], species: 'Elk', weapons: ['Archery'], fitness: 'Elite', grizzlyComfort: false, residency: 'Resident' });
    expect(p.points).toEqual({ AZ: 7, WY: 3 });
  });

  it('builds a save payload with a snapshot of the card', () => {
    const body = savePayload(
      { unit: '5B', huntCode: '3016', state: 'AZ', currentOdds: '9.2% (2026 draw, first choice)', tier: 'LONG_GAME', whyItFits: 'x', tradeoffs: 'y', season: 'Rifle' },
      { ...INITIAL_PROFILE, states: ['AZ'], species: 'Elk' },
    );
    expect(body).toMatchObject({ state: 'AZ', species: 'Elk', unit: '5B', huntCode: '3016', source: 'scout' });
    expect(body.recommendation).toMatchObject({ currentOdds: '9.2% (2026 draw, first choice)', tier: 'LONG_GAME' });
  });
});
