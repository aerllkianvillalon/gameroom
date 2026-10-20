import { useCallback, useEffect, useState } from 'react';
import { createId, createRng, randomSeed } from '@party/game-engine';
import type { WordPack } from '@party/impostor-engine';
import { deletePack, listPacks, savePack } from '../storage/db';

export function usePacks() {
  const [packs, setPacks] = useState<WordPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setPacks((await listPacks()).sort((a, b) => a.name.localeCompare(b.name)));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load word packs.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const save = async (pack: Omit<WordPack, 'id'> & { id?: string }): Promise<string | null> => {
    try {
      await savePack({ ...pack, id: pack.id ?? createId(createRng(randomSeed())) });
      await refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not save the pack.';
    }
  };
  const remove = async (id: string) => {
    try { await deletePack(id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the pack.'); }
  };
  return { packs, loading, error, save, remove };
}

export const packOptions = (packs: WordPack[]) => ({
  category: packs.map((p) => ({ value: `pack:${p.id}`, label: `Custom: ${p.name}` })),
});
