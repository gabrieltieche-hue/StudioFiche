import React, { useState } from 'react';
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { MetaPromptPreset } from '../types/fiche';
import { DEFAULT_META_PROMPT_PRESETS } from '../utils/ficheLogic';

interface MetaPromptViewProps {
  presets: MetaPromptPreset[];
  onSavePresets: (presets: MetaPromptPreset[]) => void;
}

export const MetaPromptView: React.FC<MetaPromptViewProps> = ({ presets, onSavePresets }) => {
  const [selectedId, setSelectedId] = useState(presets[0]?.id || '');
  const selected = presets.find((p) => p.id === selectedId) || presets[0];

  const [name, setName] = useState(selected?.name || '');
  const [description, setDescription] = useState(selected?.description || '');
  const [template, setTemplate] = useState(selected?.template || '');
  const [defaultCardCount, setDefaultCardCount] = useState<'auto' | '1' | '2' | '3'>(
    selected?.defaultCardCount || 'auto'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const selectPreset = (preset: MetaPromptPreset) => {
    setSelectedId(preset.id);
    setName(preset.name);
    setDescription(preset.description);
    setTemplate(preset.template);
    setDefaultCardCount(preset.defaultCardCount);
    setSavedNotice(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const next = presets.map((p) =>
      p.id === selected.id
        ? {
            ...p,
            name: name.trim() || p.name,
            description: description.trim(),
            template,
            defaultCardCount,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    onSavePresets(next);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCreatePreset = () => {
    const newPreset: MetaPromptPreset = {
      id: `preset-${Date.now()}`,
      name: 'Nouveau Méta-Prompt',
      description: 'Variante personnalisée de génération de fiches.',
      template: DEFAULT_META_PROMPT_PRESETS[0].template,
      defaultCardCount: 'auto',
      updatedAt: new Date().toISOString(),
    };
    const next = [...presets, newPreset];
    onSavePresets(next);
    selectPreset(newPreset);
  };

  const handleDeletePreset = (id: string) => {
    if (presets.length <= 1) return;
    const next = presets.filter((p) => p.id !== id);
    onSavePresets(next);
    selectPreset(next[0]);
  };

  const handleRestoreDefaults = () => {
    onSavePresets(DEFAULT_META_PROMPT_PRESETS);
    selectPreset(DEFAULT_META_PROMPT_PRESETS[0]);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Méta-Prompts NotebookLM</h1>
          <p className="text-sm text-slate-600 mt-1">
            Votre méthode en 2 temps (génération des prompts ciblés puis rédaction stricte à partir
            des PDF joints) est pré-configurée ici et entièrement personnalisable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser par défaut
          </button>
          <button
            type="button"
            onClick={handleCreatePreset}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau profil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-2">
          {presets.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-3 transition-colors ${
                p.id === selected?.id
                  ? 'bg-white border-blue-600'
                  : 'bg-white/70 border-slate-200 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => selectPreset(p)}
                  className="text-left flex-1 min-w-0"
                >
                  <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</div>
                </button>
                {presets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    aria-label={`Supprimer ${p.name}`}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSave}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_215px] gap-4">
            <div>
              <label htmlFor="preset-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nom du profil
              </label>
              <input
                id="preset-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="preset-count" className="block text-xs font-semibold text-slate-700 mb-1">
                Fiches par défaut
              </label>
              <select
                id="preset-count"
                value={defaultCardCount}
                onChange={(e) =>
                  setDefaultCardCount(e.target.value as 'auto' | '1' | '2' | '3')
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="auto">Auto (2–3 idéalement)</option>
                <option value="1">1 fiche</option>
                <option value="2">2 fiches</option>
                <option value="3">3 fiches</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="preset-desc" className="block text-xs font-semibold text-slate-700 mb-1">
              Description courte
            </label>
            <input
              id="preset-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="preset-template" className="text-xs font-semibold text-slate-700">
                Contenu du Méta-Prompt
              </label>
              <span className="text-[11px] font-mono-tabular text-slate-500">
                Variables : {'{CLASSE}'}, {'{MATIERE}'}, {'{SUJET}'}
              </span>
            </div>
            <textarea
              id="preset-template"
              rows={15}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full p-3 text-xs font-mono-tabular leading-relaxed border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {savedNotice && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Enregistré
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
