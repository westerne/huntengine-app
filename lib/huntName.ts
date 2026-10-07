// How a saved/recommended hunt is named on screen: "<unit> · Hunt <code>".
// Over-the-counter general seasons carry internal codes ("GEN-127-archery");
// those read as "General season · archery" instead.

const WEAPON: Record<string, string> = {
  archery: 'archery', muzzleloader: 'muzzleloader', rifle: 'modern firearm', any: 'any weapon',
};

export function unitText(u: string): string {
  return /^[0-9][0-9A-Z]{0,4}$/i.test(String(u)) || /^[A-Z]$/i.test(String(u)) ? `Unit ${u}` : String(u);
}

export function huntCodeText(code: string | null | undefined): string {
  if (!code) return '';
  const g = /^GEN-[^-]+-(\w+)$/i.exec(code);
  return g ? `General season · ${WEAPON[g[1].toLowerCase()] ?? g[1]}` : `Hunt ${code}`;
}

export function huntTitle(unit: string, code: string | null | undefined): string {
  const c = huntCodeText(code);
  return `${unitText(unit)}${c ? ` · ${c}` : ''}`;
}

// The same, inside model-written prose ("put GEN-127-any first").
export function humanizeCodes(text: string): string {
  return text.replace(/\bGEN-([0-9A-Z]+)-(\w+)\b/gi, (_m, u, w) => `the GMU ${u} general season (${WEAPON[String(w).toLowerCase()] ?? w})`);
}
