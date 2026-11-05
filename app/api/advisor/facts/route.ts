import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { addFact, cleanFactText, editFact, factsOf, removeFact, type Fact } from '@/lib/advisor/facts';

// What the advisor knows about you (docs/SPEC_ADVISOR.md §7), kept on
// profiles.planning.facts beside the guided-setup answers.
//   GET                        → { facts }
//   POST   { text }            → add (from the advisor's "Remember" button)
//   PATCH  { id, text }        → edit
//   DELETE { id } | { all }    → delete one, or all

const TODAY = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());

async function load() {
  const auth = await requireMember();
  if ('error' in auth) return { error: auth.error };
  const supabase = await supabaseServer();
  const userId = auth.viewer.userId!;
  const { data, error } = await supabase.from('profiles').select('planning').eq('user_id', userId).maybeSingle();
  if (error) return { error: NextResponse.json({ error: 'Could not load what the advisor knows.' }, { status: 500 }) };
  const planning = (data?.planning ?? {}) as Record<string, unknown>;
  const save = async (facts: Fact[]) => {
    const { error: e } = await supabase.from('profiles').upsert({ user_id: userId, planning: { ...planning, facts } }, { onConflict: 'user_id' });
    return e ? NextResponse.json({ error: 'Could not save that.' }, { status: 500 }) : NextResponse.json({ facts });
  };
  return { facts: factsOf(planning), save };
}

export async function GET() {
  const r = await load();
  return 'error' in r ? r.error : NextResponse.json({ facts: r.facts });
}

export async function POST(req: Request) {
  const r = await load();
  if ('error' in r) return r.error;
  const text = cleanFactText((await req.json().catch(() => null))?.text);
  if (!text) return NextResponse.json({ error: 'Nothing to remember.' }, { status: 400 });
  return r.save(addFact(r.facts, text, crypto.randomUUID(), TODAY()));
}

export async function PATCH(req: Request) {
  const r = await load();
  if ('error' in r) return r.error;
  const body = await req.json().catch(() => null);
  const text = cleanFactText(body?.text);
  if (typeof body?.id !== 'string' || !text) return NextResponse.json({ error: 'Write the fact out.' }, { status: 400 });
  if (!r.facts.some((f) => f.id === body.id)) return NextResponse.json({ error: 'That fact is gone.' }, { status: 404 });
  return r.save(editFact(r.facts, body.id, text));
}

export async function DELETE(req: Request) {
  const r = await load();
  if ('error' in r) return r.error;
  const body = await req.json().catch(() => null);
  if (body?.all === true) return r.save([]);
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Which fact?' }, { status: 400 });
  return r.save(removeFact(r.facts, body.id));
}
