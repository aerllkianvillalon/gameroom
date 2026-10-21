import { useState } from 'react';
import { PACK_MAX_WORDS, PACK_MIN_WORDS, parseWords, validatePack, type WordPack } from '@party/impostor-engine';
import { Button } from '../ui/Button';
import { usePacks } from '../hooks/usePacks';

export function WordPacks() {
  const { packs, loading, error, save, remove } = usePacks();
  const [editing, setEditing] = useState<WordPack | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [problem, setProblem] = useState('');
  const words = parseWords(text);

  const reset = () => { setEditing(null); setName(''); setText(''); setProblem(''); };
  const edit = (p: WordPack) => { setEditing(p); setName(p.name); setText(p.words.join('\n')); setProblem(''); };
  const submit = async () => {
    const msg = validatePack(name, words);
    if (msg) return setProblem(msg);
    const failed = await save({ id: editing?.id, name: name.trim(), words });
    if (failed) return setProblem(failed);
    reset();
  };

  return (
    <div className="max-w-2xl pb-4">
      <h1 className="page-title">Word packs</h1>
      <p className="lede mt-3">Make your own word lists for ImpostorWho. They are saved on this device and work offline. Pick one under "Word category" when you create a room.</p>

      <section className="mt-8" aria-labelledby="form-h">
        <h2 id="form-h" className="section-title">{editing ? `Edit "${editing.name}"` : 'New pack'}</h2>
        <label htmlFor="pack-name" className="mt-4 block font-semibold">Pack name</label>
        <input id="pack-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} className="field mt-1.5 max-w-sm" />
        <label htmlFor="pack-words" className="mt-5 block font-semibold">Words</label>
        <p id="pack-help" className="text-sm text-paper-dim">One per line or separated by commas. {PACK_MIN_WORDS} to {PACK_MAX_WORDS} words.</p>
        <textarea id="pack-words" aria-describedby="pack-help" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="field mt-1 w-full" />
        <p className="mt-1 text-sm text-paper-dim" aria-live="polite">{words.length} {words.length === 1 ? 'word' : 'words'}</p>
        {problem && <p role="alert" className="mt-2 text-card-red">{problem}</p>}
        <div className="mt-4 flex gap-3">
          <Button onClick={submit}>{editing ? 'Save changes' : 'Save pack'}</Button>
          {(editing || name || text) && <Button variant="ghost" onClick={reset}>{editing ? 'Cancel' : 'Clear'}</Button>}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="list-h">
        <h2 id="list-h" className="section-title">Your packs</h2>
        {error && <p role="alert" className="mt-2 text-card-red">{error}</p>}
        {loading ? <p className="mt-2 text-paper-dim">Loading...</p> : packs.length === 0 && !error ? <p className="mt-2 text-paper-dim">No packs yet.</p> : (
          <ul className="mt-3 space-y-2">
            {packs.map((p) => (
              <li key={p.id} className="panel-flat flex flex-wrap items-center justify-between gap-2 p-3">
                <span><span className="font-semibold">{p.name}</span> <span className="text-paper-dim">({p.words.length} words)</span></span>
                <span className="flex gap-2">
                  <Button variant="secondary" onClick={() => edit(p)} aria-label={`Edit ${p.name}`}>Edit</Button>
                  <Button variant="ghost" onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) void remove(p.id); }} aria-label={`Delete ${p.name}`}>Delete</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
