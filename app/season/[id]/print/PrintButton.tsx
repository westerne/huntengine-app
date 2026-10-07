'use client';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="bg-black text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-zinc-800">
      Print
    </button>
  );
}
