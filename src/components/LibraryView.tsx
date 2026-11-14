import React, { useMemo, useState } from 'react';
import { Copy, FileText, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { FicheDeck, SubjectKey } from '../types/fiche';
import { SUBJECT_PALETTES } from '../utils/ficheLogic';

interface LibraryViewProps {
  decks: FicheDeck[];
  activeDeckId: string | null;
  onOpenDeck: (deckId: string) => void;
  onDuplicateDeck: (deck: FicheDeck) => void;
  onDeleteDeck: (deckId: string) => void;
  onCreateNew: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  decks,
  activeDeckId,
  onOpenDeck,
  onDuplicateDeck,
  onDeleteDeck,
  onCreateNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectKey>('ALL');

  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      const matchesSubject = subjectFilter === 'ALL' || deck.subject === subjectFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        deck.title.toLowerCase().includes(q) ||
        deck.subject.toLowerCase().includes(q) ||
        deck.className.toLowerCase().includes(q);
      return matchesSubject && matchesSearch;
    });
  }, [decks, searchQuery, subjectFilter]);

  const availableSubjects = useMemo(() => {
    const set = new Set<SubjectKey>();
    for (const d of decks) set.add(d.subject);
    return Array.from(set);
  }, [decks]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bibliothèque de fiches</h1>
          <p className="text-sm text-slate-600 mt-1">
            Retrouvez toutes vos fiches sauvegardées localement dans votre navigateur, triées par
            matière et prêtes à réimprimer.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg whitespace-nowrap shrink-0"
        >
          Nouvelle fiche depuis PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un chapitre, une matière..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setSubjectFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subjectFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({decks.length})
          </button>
          {availableSubjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSubjectFilter(subj)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subjectFilter === subj
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {SUBJECT_PALETTES[subj].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredDecks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">Aucune fiche correspondante</h3>
          <p className="text-sm text-slate-600 mt-1">
            Modifiez vos filtres ou importez un nouveau cours PDF dans l’Atelier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => {
            const palette = SUBJECT_PALETTES[deck.subject];
            const isActive = deck.id === activeDeckId;
            return (
              <div
                key={deck.id}
                className={`bg-white rounded-xl border transition-colors flex flex-col overflow-hidden ${
                  isActive ? 'border-blue-600' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Miniature pastel header strip */}
                <div
                  className="px-4 py-3 border-b border-slate-900/10 flex items-center justify-between text-xs font-bold text-slate-900"
                  style={{ backgroundColor: deck.cards[0]?.backgroundHex || palette.backgroundHex }}
                >
                  <span className="underline">{deck.className}</span>
                  <span className="uppercase tracking-wide truncate mx-2">{palette.label}</span>
                  <span className="font-mono-tabular underline">{deck.dateLabel}</span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{deck.title}</h3>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
                      <span className="font-mono-tabular whitespace-nowrap shrink-0">
                        {deck.cards.length} {deck.cards.length > 1 ? 'fiches' : 'fiche'} (14×19 cm)
                      </span>
                      <span aria-hidden="true" className="shrink-0">·</span>
                      <span className="truncate">{deck.sourceFileNames.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenDeck(deck.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Ouvrir
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicateDeck(deck)}
                        aria-label={`Dupliquer ${deck.title}`}
                        title="Dupliquer"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDeck(deck.id)}
                        aria-label={`Supprimer ${deck.title}`}
                        title="Supprimer"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
