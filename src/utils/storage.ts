import { SAMPLE_DECKS } from '../data/sampleDecks';
import type { FicheDeck, MetaPromptPreset, PrintProfile } from '../types/fiche';
import { DEFAULT_META_PROMPT_PRESETS, DEFAULT_PRINT_PROFILE } from './ficheLogic';

const DB_NAME = 'fichestudio_db';
const DB_VERSION = 1;
const STORE_DECKS = 'decks';
const KEY_PROFILE = 'fichestudio_print_profile_v1';
const KEY_PRESETS = 'fichestudio_meta_presets_v1';
const KEY_FALLBACK_DECKS = 'fichestudio_decks_fallback_v1';
const KEY_INITIALIZED = 'fichestudio_initialized_v1';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_DECKS)) {
          db.createObjectStore(STORE_DECKS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function fetchServerDecks(): Promise<FicheDeck[]> {
  try {
    const res = await fetch('/api/decks', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { decks?: FicheDeck[] };
    return Array.isArray(data.decks) ? data.decks : [];
  } catch {
    return [];
  }
}

async function pushDeckToServer(deck: FicheDeck): Promise<void> {
  try {
    await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ deck }),
    });
  } catch {
    // Non-blocking sync; local IndexedDB copy remains intact
  }
}

async function removeDeckFromServer(deckId: string): Promise<void> {
  try {
    await fetch(`/api/decks/${encodeURIComponent(deckId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch {
    // Non-blocking sync
  }
}

function mergeDecksByNewest(localDecks: FicheDeck[], serverDecks: FicheDeck[]): FicheDeck[] {
  const byId = new Map<string, FicheDeck>();
  for (const d of localDecks) {
    if (d?.id) byId.set(d.id, d);
  }
  for (const s of serverDecks) {
    if (!s?.id) continue;
    const prev = byId.get(s.id);
    if (!prev || (s.updatedAt || '') >= (prev.updatedAt || '')) {
      byId.set(s.id, s);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

async function loadLocalDecks(): Promise<FicheDeck[]> {
  const db = await openDatabase();
  const initialized = window.localStorage.getItem(KEY_INITIALIZED);

  if (db) {
    const existing = await new Promise<FicheDeck[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_DECKS, 'readonly');
        const store = tx.objectStore(STORE_DECKS);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as FicheDeck[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });

    if (existing.length > 0) {
      return existing.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    if (!initialized) {
      await saveAllDecks(SAMPLE_DECKS);
      window.localStorage.setItem(KEY_INITIALIZED, '1');
      return SAMPLE_DECKS;
    }
    return [];
  }

  try {
    const raw = window.localStorage.getItem(KEY_FALLBACK_DECKS);
    if (raw) {
      return (JSON.parse(raw) as FicheDeck[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    if (!initialized) {
      window.localStorage.setItem(KEY_FALLBACK_DECKS, JSON.stringify(SAMPLE_DECKS));
      window.localStorage.setItem(KEY_INITIALIZED, '1');
      return SAMPLE_DECKS;
    }
  } catch {
    return SAMPLE_DECKS;
  }
  return [];
}

export async function loadDecks(): Promise<FicheDeck[]> {
  const [localDecks, serverDecks] = await Promise.all([loadLocalDecks(), fetchServerDecks()]);
  const merged = mergeDecksByNewest(localDecks, serverDecks);
  if (serverDecks.length > 0) {
    await saveAllDecks(merged);
  }
  return merged;
}

export async function saveDeck(deck: FicheDeck): Promise<void> {
  const updated: FicheDeck = { ...deck, updatedAt: new Date().toISOString() };
  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_DECKS, 'readwrite');
        tx.objectStore(STORE_DECKS).put(updated);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const current = await loadLocalDecks();
    const next = [updated, ...current.filter((d) => d.id !== updated.id)];
    window.localStorage.setItem(KEY_FALLBACK_DECKS, JSON.stringify(next));
  }
  void pushDeckToServer(updated);
}

async function saveAllDecks(decks: FicheDeck[]): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_DECKS, 'readwrite');
        const store = tx.objectStore(STORE_DECKS);
        for (const d of decks) store.put(d);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return;
  }
  window.localStorage.setItem(KEY_FALLBACK_DECKS, JSON.stringify(decks));
}

export async function deleteDeck(deckId: string): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_DECKS, 'readwrite');
        tx.objectStore(STORE_DECKS).delete(deckId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const current = await loadLocalDecks();
    window.localStorage.setItem(
      KEY_FALLBACK_DECKS,
      JSON.stringify(current.filter((d) => d.id !== deckId))
    );
  }
  void removeDeckFromServer(deckId);
}

export function loadPrintProfile(): PrintProfile {
  try {
    const raw = window.localStorage.getItem(KEY_PROFILE);
    if (!raw) return DEFAULT_PRINT_PROFILE;
    return { ...DEFAULT_PRINT_PROFILE, ...(JSON.parse(raw) as Partial<PrintProfile>) };
  } catch {
    return DEFAULT_PRINT_PROFILE;
  }
}

export function savePrintProfile(profile: PrintProfile): void {
  try {
    window.localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function loadMetaPromptPresets(): MetaPromptPreset[] {
  try {
    const raw = window.localStorage.getItem(KEY_PRESETS);
    if (!raw) return DEFAULT_META_PROMPT_PRESETS;
    const parsed = JSON.parse(raw) as MetaPromptPreset[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_META_PROMPT_PRESETS;
  } catch {
    return DEFAULT_META_PROMPT_PRESETS;
  }
}

export function saveMetaPromptPresets(presets: MetaPromptPreset[]): void {
  try {
    window.localStorage.setItem(KEY_PRESETS, JSON.stringify(presets));
  } catch {
    // ignore storage quota errors
  }
}
