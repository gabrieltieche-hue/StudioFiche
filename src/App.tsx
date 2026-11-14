/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import type { FicheDeck, MetaPromptPreset, PrintProfile } from './types/fiche';
import {
  DEFAULT_META_PROMPT_PRESETS,
  DEFAULT_PRINT_PROFILE,
} from './utils/ficheLogic';
import {
  deleteDeck,
  loadDecks,
  loadMetaPromptPresets,
  loadPrintProfile,
  saveDeck,
  saveMetaPromptPresets,
  savePrintProfile,
} from './utils/storage';
import { AtelierView } from './components/AtelierView';
import { LibraryView } from './components/LibraryView';
import { MetaPromptView } from './components/MetaPromptView';
import { PrintSettingsView } from './components/PrintSettingsView';
import { FicheSheetPreview } from './components/FicheSheetPreview';

type ActiveTab = 'atelier' | 'bibliotheque' | 'metaprompt' | 'impression';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('atelier');
  const [decks, setDecks] = useState<FicheDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [presets, setPresets] = useState<MetaPromptPreset[]>(DEFAULT_META_PROMPT_PRESETS);
  const [printProfile, setPrintProfile] = useState<PrintProfile>(DEFAULT_PRINT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [loadedDecks, loadedPresets, loadedProfile] = await Promise.all([
        loadDecks(),
        Promise.resolve(loadMetaPromptPresets()),
        Promise.resolve(loadPrintProfile()),
      ]);
      if (!mounted) return;
      setDecks(loadedDecks);
      setActiveDeckId(loadedDecks[0]?.id ?? null);
      setPresets(loadedPresets);
      setPrintProfile(loadedProfile);
      setIsLoaded(true);
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? null;

  const handleDeckCreated = async (newDeck: FicheDeck) => {
    await saveDeck(newDeck);
    setDecks((prev) => [newDeck, ...prev.filter((d) => d.id !== newDeck.id)]);
    setActiveDeckId(newDeck.id);
    setActiveTab('atelier');
  };

  const handleUpdateDeck = async (updatedDeck: FicheDeck) => {
    const withTimestamp = { ...updatedDeck, updatedAt: new Date().toISOString() };
    setDecks((prev) => prev.map((d) => (d.id === withTimestamp.id ? withTimestamp : d)));
    await saveDeck(withTimestamp);
  };

  const handleDuplicateDeck = async (deck: FicheDeck) => {
    const now = new Date().toISOString();
    const copy: FicheDeck = {
      ...deck,
      id: `deck-${Date.now()}`,
      title: `${deck.title} (copie)`,
      createdAt: now,
      updatedAt: now,
      cards: deck.cards.map((c, idx) => ({ ...c, id: `card-${Date.now()}-${idx}` })),
    };
    await saveDeck(copy);
    setDecks((prev) => [copy, ...prev]);
    setActiveDeckId(copy.id);
    setActiveTab('atelier');
  };

  const handleDeleteDeck = async (deckId: string) => {
    await deleteDeck(deckId);
    setDecks((prev) => {
      const remaining = prev.filter((d) => d.id !== deckId);
      if (activeDeckId === deckId) {
        setActiveDeckId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const handleSavePresets = (nextPresets: MetaPromptPreset[]) => {
    setPresets(nextPresets);
    saveMetaPromptPresets(nextPresets);
  };

  const handleUpdatePrintProfile = (nextProfile: PrintProfile) => {
    setPrintProfile(nextProfile);
    savePrintProfile(nextProfile);
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar (3-zone contract: Brand — 4 single-line links — 1 primary action) */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-8">
        <a
          href="#atelier"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('atelier');
          }}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          FicheStudio
        </a>

        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
        >
          {(
            [
              { id: 'atelier', label: 'Atelier' },
              { id: 'bibliotheque', label: 'Bibliothèque' },
              { id: 'metaprompt', label: 'Méta-Prompt' },
              { id: 'impression', label: 'Impression' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'border-blue-700 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeDeck) {
                handlePrintAll();
              } else {
                setActiveTab('atelier');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {activeDeck ? 'Exporter PDF' : 'Nouvelle fiche'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="no-print">
        {!isLoaded ? (
          <div className="p-12 text-center text-sm text-slate-500">Chargement de l’atelier...</div>
        ) : activeTab === 'atelier' ? (
          <AtelierView
            activeDeck={activeDeck}
            presets={presets}
            printProfile={printProfile}
            onDeckCreated={handleDeckCreated}
            onUpdateDeck={handleUpdateDeck}
            onPrintAll={handlePrintAll}
          />
        ) : activeTab === 'bibliotheque' ? (
          <LibraryView
            decks={decks}
            activeDeckId={activeDeckId}
            onOpenDeck={(id) => {
              setActiveDeckId(id);
              setActiveTab('atelier');
            }}
            onDuplicateDeck={handleDuplicateDeck}
            onDeleteDeck={handleDeleteDeck}
            onCreateNew={() => setActiveTab('atelier')}
          />
        ) : activeTab === 'metaprompt' ? (
          <MetaPromptView presets={presets} onSavePresets={handleSavePresets} />
        ) : (
          <PrintSettingsView
            profile={printProfile}
            onUpdateProfile={handleUpdatePrintProfile}
          />
        )}
      </main>

      {/* Print-only Full-Scale Sheets (297mm x 210mm with 140x190mm Recto + Verso) */}
      {activeDeck && (
        <div className="print-only-wrapper hidden">
          {activeDeck.cards.map((card) => (
            <FicheSheetPreview
              key={card.id}
              card={card}
              profile={printProfile}
              scale={1}
              editable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
