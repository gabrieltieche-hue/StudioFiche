import React, { useState } from 'react';
import { ArrowLeftRight, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type {
  FicheBlock,
  FicheCard,
  FicheSection,
  PrintProfile,
  TextSpan,
} from '../types/fiche';
import {
  computeSheetGeometry,
  estimateSideDensity,
  markupToSpans,
  spansToMarkup,
  SUBJECT_PALETTES,
} from '../utils/ficheLogic';
import { DiagramRenderer } from './DiagramRenderer';

interface FicheSheetPreviewProps {
  card: FicheCard;
  profile: PrintProfile;
  scale?: number;
  editable?: boolean;
  onUpdateCard?: (updated: FicheCard) => void;
}

function renderSpans(spans: TextSpan[]) {
  return spans.map((span, idx) => {
    if (span.tone === 'redBold') {
      return (
        <span key={idx} className="font-bold text-[#DC2626]">
          {span.text}
        </span>
      );
    }
    if (span.tone === 'bold') {
      return (
        <span key={idx} className="font-bold text-slate-950">
          {span.text}
        </span>
      );
    }
    if (span.tone === 'underline') {
      return (
        <span key={idx} className="underline decoration-slate-900/80 underline-offset-2 font-semibold">
          {span.text}
        </span>
      );
    }
    if (span.tone === 'italic') {
      return (
        <span key={idx} className="italic">
          {span.text}
        </span>
      );
    }
    return <React.Fragment key={idx}>{span.text}</React.Fragment>;
  });
}

export const FicheSheetPreview: React.FC<FicheSheetPreviewProps> = ({
  card,
  profile,
  scale = 1,
  editable = true,
  onUpdateCard,
}) => {
  const [editingTarget, setEditingTarget] = useState<{
    side: 'leftSide' | 'rightSide';
    sectionId: string;
    blockId?: string;
    mode: 'sectionTitle' | 'paragraph' | 'bulletItem' | 'formula' | 'vocab';
    itemId?: string;
    draft: string;
    extraDraft?: string;
  } | null>(null);

  const geometry = computeSheetGeometry(profile);
  const palette = SUBJECT_PALETTES[card.subject];
  const subjectHeaderText =
    card.customSubjectLabel?.trim() || palette.headerDisplay || card.subject.toUpperCase();

  const leftDensity = estimateSideDensity(card.leftSide, card.fontSizePt, card.lineHeight);
  const rightDensity = estimateSideDensity(card.rightSide, card.fontSizePt, card.lineHeight);

  const applySectionUpdate = (
    sideKey: 'leftSide' | 'rightSide',
    updater: (sections: FicheSection[]) => FicheSection[]
  ) => {
    if (!onUpdateCard) return;
    onUpdateCard({
      ...card,
      [sideKey]: {
        sections: updater(card[sideKey].sections),
      },
    });
  };

  const moveSectionBetweenSides = (
    fromSide: 'leftSide' | 'rightSide',
    sectionId: string
  ) => {
    if (!onUpdateCard) return;
    const toSide = fromSide === 'leftSide' ? 'rightSide' : 'leftSide';
    const target = card[fromSide].sections.find((s) => s.id === sectionId);
    if (!target) return;

    onUpdateCard({
      ...card,
      [fromSide]: {
        sections: card[fromSide].sections.filter((s) => s.id !== sectionId),
      },
      [toSide]: {
        sections:
          fromSide === 'leftSide'
            ? [target, ...card[toSide].sections]
            : [...card[toSide].sections, target],
      },
    });
  };

  const handleSaveEdit = () => {
    if (!editingTarget) return;
    const { side, sectionId, blockId, mode, itemId, draft, extraDraft } = editingTarget;

    applySectionUpdate(side, (sections) =>
      sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        if (mode === 'sectionTitle') {
          return { ...sec, title: draft };
        }
        return {
          ...sec,
          blocks: sec.blocks.map((blk): FicheBlock => {
            if (blk.id !== blockId) return blk;
            if (mode === 'paragraph' && blk.type === 'paragraph') {
              return { ...blk, spans: markupToSpans(draft) };
            }
            if (mode === 'bulletItem' && blk.type === 'bulletList') {
              return {
                ...blk,
                items: blk.items.map((it) =>
                  it.id === itemId ? { ...it, spans: markupToSpans(draft) } : it
                ),
              };
            }
            if (mode === 'formula' && blk.type === 'formulaBox') {
              return {
                ...blk,
                formula: draft,
                caption: extraDraft ?? blk.caption,
              };
            }
            if (mode === 'vocab' && blk.type === 'vocabList') {
              return {
                ...blk,
                items: blk.items.map((it) =>
                  it.id === itemId
                    ? { ...it, term: draft, definition: extraDraft ?? it.definition }
                    : it
                ),
              };
            }
            return blk;
          }),
        };
      })
    );
    setEditingTarget(null);
  };

  const addQuickParagraph = (sideKey: 'leftSide' | 'rightSide', sectionId: string) => {
    applySectionUpdate(sideKey, (sections) =>
      sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              blocks: [
                ...sec.blocks,
                {
                  id: `blk-${Date.now()}`,
                  type: 'paragraph',
                  spans: [
                    { text: 'Nouveau point : ', tone: 'underline' },
                    { text: 'cliquez pour modifier (utilisez [rouge]...[/rouge]).', tone: 'normal' },
                  ],
                },
              ],
            }
          : sec
      )
    );
  };

  const deleteBlock = (sideKey: 'leftSide' | 'rightSide', sectionId: string, blockId: string) => {
    applySectionUpdate(sideKey, (sections) =>
      sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, blocks: sec.blocks.filter((b) => b.id !== blockId) }
          : sec
      )
    );
  };

  const renderPanelContent = (sideKey: 'leftSide' | 'rightSide', isLeftPanel: boolean) => {
    const side = card[sideKey];
    const gridStyle =
      card.visualStyle === '3eB'
        ? {
            backgroundColor: card.backgroundHex,
            backgroundImage: `linear-gradient(to right, ${palette.gridLineHex} 1px, transparent 1px), linear-gradient(to bottom, ${palette.gridLineHex} 1px, transparent 1px)`,
            backgroundSize: '4.8mm 4.8mm',
          }
        : {
            backgroundColor: card.backgroundHex,
          };

    return (
      <div
        className="font-fiche relative flex flex-col overflow-hidden text-slate-950 select-text"
        style={{
          width: `${profile.cardWidthMm}mm`,
          height: `${profile.cardHeightMm}mm`,
          padding: '5.5mm 6mm 5mm 6mm',
          ...gridStyle,
        }}
      >
        {/* Header on Left Panel (Recto), and compact continuation or full header on Verso */}
        {isLeftPanel ? (
          <div className="mb-2.5 shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[9.5pt] font-bold underline decoration-slate-900 underline-offset-2">
                {card.className}
              </span>
              <span
                className={`text-center tracking-wide font-extrabold ${
                  card.visualStyle === '3eB'
                    ? 'text-[14pt] text-white drop-shadow-[0_1px_0_#0f172a]'
                    : 'text-[11.5pt] text-slate-950 uppercase'
                }`}
              >
                {subjectHeaderText}
              </span>
              <span className="text-[9.5pt] font-bold underline decoration-slate-900 underline-offset-2 font-mono-tabular">
                {card.dateLabel}
              </span>
            </div>
            <div
              className={`text-center font-bold mt-0.5 leading-snug ${
                card.visualStyle === '3eB' ? 'text-[9.5pt] underline' : 'text-[9.5pt]'
              }`}
            >
              {card.title}
            </div>
          </div>
        ) : (
          <div className="mb-1.5 shrink-0 flex items-center justify-between text-[7.5pt] text-slate-700/80 border-b border-slate-900/10 pb-0.5">
            <span className="font-semibold truncate max-w-[75%]">{card.title}</span>
            <span className="font-mono-tabular">
              {card.className} · {card.dateLabel}
            </span>
          </div>
        )}

        {/* Sections */}
        <div
          className="flex-1 space-y-2 overflow-hidden"
          style={{
            fontSize: `${card.fontSizePt}pt`,
            lineHeight: card.lineHeight,
          }}
        >
          {side.sections.map((section, secIdx) => (
            <div key={section.id || `sec-${secIdx}`} className="group/sec relative">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                {editingTarget?.mode === 'sectionTitle' &&
                editingTarget.side === sideKey &&
                editingTarget.sectionId === section.id ? (
                  <div className="no-print flex items-center gap-1 w-full bg-white/95 rounded p-1 border border-blue-500">
                    <input
                      type="text"
                      value={editingTarget.draft}
                      onChange={(e) =>
                        setEditingTarget({ ...editingTarget, draft: e.target.value })
                      }
                      className="flex-1 text-[9pt] font-semibold px-1 py-0.5 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      aria-label="Valider le titre"
                      className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTarget(null)}
                      aria-label="Annuler"
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <h4
                    onClick={() => {
                      if (!editable) return;
                      setEditingTarget({
                        side: sideKey,
                        sectionId: section.id,
                        mode: 'sectionTitle',
                        draft: section.title,
                      });
                    }}
                    className={`font-bold text-[#1D4ED8] underline decoration-[#1D4ED8] underline-offset-2 leading-tight ${
                      editable ? 'cursor-pointer hover:bg-white/30 rounded px-0.5 -mx-0.5' : ''
                    } ${section.isSubHeader ? 'text-[9.5pt]' : 'text-[10pt]'}`}
                  >
                    {section.romanNumeral} {section.title}
                  </h4>
                )}

                {editable && (
                  <div className="no-print opacity-0 group-hover/sec:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => addQuickParagraph(sideKey, section.id)}
                      title="Ajouter un paragraphe"
                      aria-label={`Ajouter un bloc dans ${section.title}`}
                      className="p-0.5 rounded bg-white/80 hover:bg-white text-slate-700 border border-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSectionBetweenSides(sideKey, section.id)}
                      title={isLeftPanel ? 'Basculer vers Verso' : 'Basculer vers Recto'}
                      aria-label={`Déplacer ${section.title} vers ${isLeftPanel ? 'Verso' : 'Recto'}`}
                      className="p-0.5 rounded bg-white/80 hover:bg-white text-slate-700 border border-slate-300"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                {section.blocks.map((block, blkIdx) => {
                  if (block.type === 'paragraph') {
                    const isEditing =
                      editingTarget?.mode === 'paragraph' &&
                      editingTarget.side === sideKey &&
                      editingTarget.sectionId === section.id &&
                      editingTarget.blockId === block.id;
                    if (isEditing) {
                      return (
                        <div
                          key={block.id || `blk-${blkIdx}`}
                          className="no-print bg-white/95 rounded p-1.5 border border-blue-500 space-y-1"
                        >
                          <textarea
                            rows={3}
                            value={editingTarget.draft}
                            onChange={(e) =>
                              setEditingTarget({ ...editingTarget, draft: e.target.value })
                            }
                            className="w-full text-[8.5pt] p-1 border border-slate-200 rounded outline-none"
                          />
                          <div className="flex items-center justify-between text-[7.5pt] text-slate-500">
                            <span>Astuce : [rouge]mot[/rouge], **gras**, __souligné__</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="px-2 py-0.5 bg-blue-700 text-white rounded font-medium"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTarget(null)}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={block.id} className="group/blk relative">
                        <p
                          onClick={() => {
                            if (!editable) return;
                            setEditingTarget({
                              side: sideKey,
                              sectionId: section.id,
                              blockId: block.id,
                              mode: 'paragraph',
                              draft: spansToMarkup(block.spans),
                            });
                          }}
                          className={`text-slate-900 ${
                            editable ? 'cursor-pointer hover:bg-white/35 rounded px-0.5 -mx-0.5' : ''
                          }`}
                        >
                          {renderSpans(block.spans)}
                        </p>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => deleteBlock(sideKey, section.id, block.id)}
                            aria-label="Supprimer ce paragraphe"
                            className="no-print opacity-0 group-hover/blk:opacity-100 absolute -right-1 top-0 p-0.5 bg-white/90 text-red-600 rounded border border-red-200"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (block.type === 'bulletList') {
                    return (
                      <ul key={block.id || `blk-${blkIdx}`} className="space-y-0.5">
                        {block.items.map((item, itmIdx) => {
                          const isEditing =
                            editingTarget?.mode === 'bulletItem' &&
                            editingTarget.side === sideKey &&
                            editingTarget.sectionId === section.id &&
                            editingTarget.blockId === block.id &&
                            editingTarget.itemId === item.id;
                          if (isEditing) {
                            return (
                              <li
                                key={item.id || `itm-${itmIdx}`}
                                className="no-print bg-white/95 rounded p-1.5 border border-blue-500 space-y-1"
                              >
                                <textarea
                                  rows={2}
                                  value={editingTarget.draft}
                                  onChange={(e) =>
                                    setEditingTarget({ ...editingTarget, draft: e.target.value })
                                  }
                                  className="w-full text-[8.5pt] p-1 border border-slate-200 rounded outline-none"
                                />
                                <div className="flex justify-end gap-1 text-[7.5pt]">
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="px-2 py-0.5 bg-blue-700 text-white rounded"
                                  >
                                    OK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTarget(null)}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </li>
                            );
                          }
                          return (
                            <li
                              key={item.id}
                              onClick={() => {
                                if (!editable) return;
                                setEditingTarget({
                                  side: sideKey,
                                  sectionId: section.id,
                                  blockId: block.id,
                                  itemId: item.id,
                                  mode: 'bulletItem',
                                  draft: spansToMarkup(item.spans),
                                });
                              }}
                              className={`flex items-start gap-1.5 ${
                                item.level === 2 ? 'pl-3.5' : 'pl-0.5'
                              } ${
                                editable
                                  ? 'cursor-pointer hover:bg-white/35 rounded px-0.5 -mx-0.5'
                                  : ''
                              }`}
                            >
                              <span className="shrink-0 font-bold text-slate-900">
                                {item.level === 2 ? '◦' : '•'}
                              </span>
                              <span>{renderSpans(item.spans)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }

                  if (block.type === 'formulaBox') {
                    const isEditing =
                      editingTarget?.mode === 'formula' &&
                      editingTarget.side === sideKey &&
                      editingTarget.sectionId === section.id &&
                      editingTarget.blockId === block.id;
                    if (isEditing) {
                      return (
                        <div
                          key={block.id || `blk-${blkIdx}`}
                          className="no-print bg-white/95 rounded p-1.5 border border-blue-500 space-y-1"
                        >
                          <input
                            type="text"
                            value={editingTarget.draft}
                            onChange={(e) =>
                              setEditingTarget({ ...editingTarget, draft: e.target.value })
                            }
                            className="w-full text-[9pt] font-bold text-red-600 p-1 border border-slate-200 rounded"
                          />
                          <input
                            type="text"
                            value={editingTarget.extraDraft ?? ''}
                            placeholder="Légende optionnelle"
                            onChange={(e) =>
                              setEditingTarget({ ...editingTarget, extraDraft: e.target.value })
                            }
                            className="w-full text-[8pt] p-1 border border-slate-200 rounded"
                          />
                          <div className="flex justify-end gap-1 text-[7.5pt]">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-2 py-0.5 bg-blue-700 text-white rounded"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTarget(null)}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={block.id}
                        onClick={() => {
                          if (!editable) return;
                          setEditingTarget({
                            side: sideKey,
                            sectionId: section.id,
                            blockId: block.id,
                            mode: 'formula',
                            draft: block.formula,
                            extraDraft: block.caption || '',
                          });
                        }}
                        className={`my-1 rounded bg-white/65 border border-slate-900/10 px-2.5 py-1.5 text-center ${
                          editable ? 'cursor-pointer hover:bg-white/85' : ''
                        }`}
                      >
                        {block.title && (
                          <div className="text-[8pt] font-semibold text-slate-700">
                            {block.title}
                          </div>
                        )}
                        <div className="text-[10.5pt] font-extrabold text-[#DC2626] tracking-wide my-0.5">
                          {block.formula}
                        </div>
                        {block.caption && (
                          <div className="text-[7.8pt] text-slate-700">{block.caption}</div>
                        )}
                      </div>
                    );
                  }

                  if (block.type === 'table') {
                    return (
                      <div key={block.id} className="my-1 overflow-hidden rounded border border-slate-900/20 bg-white/85">
                        <table className="w-full border-collapse text-[7.8pt]">
                          <thead>
                            <tr className="bg-slate-900/5 border-b border-slate-900/15">
                              {block.headers.map((h, i) => (
                                <th key={i} className="px-1.5 py-1 text-left font-bold text-slate-900">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-900/10 last:border-b-0">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-1.5 py-0.5 align-top text-slate-800">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (block.type === 'vocabList') {
                    return (
                      <div key={block.id} className="space-y-1">
                        {block.items.map((item) => {
                          const isEditing =
                            editingTarget?.blockId === block.id &&
                            editingTarget.itemId === item.id &&
                            editingTarget.mode === 'vocab';
                          if (isEditing) {
                            return (
                              <div
                                key={item.id}
                                className="no-print bg-white/95 rounded p-1.5 border border-blue-500 space-y-1"
                              >
                                <input
                                  type="text"
                                  value={editingTarget.draft}
                                  onChange={(e) =>
                                    setEditingTarget({ ...editingTarget, draft: e.target.value })
                                  }
                                  className="w-full text-[8.5pt] font-bold text-red-600 p-1 border border-slate-200 rounded"
                                />
                                <textarea
                                  rows={2}
                                  value={editingTarget.extraDraft ?? ''}
                                  onChange={(e) =>
                                    setEditingTarget({
                                      ...editingTarget,
                                      extraDraft: e.target.value,
                                    })
                                  }
                                  className="w-full text-[8pt] p-1 border border-slate-200 rounded"
                                />
                                <div className="flex justify-end gap-1 text-[7.5pt]">
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="px-2 py-0.5 bg-blue-700 text-white rounded"
                                  >
                                    OK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingTarget(null)}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <p
                              key={item.id}
                              onClick={() => {
                                if (!editable) return;
                                setEditingTarget({
                                  side: sideKey,
                                  sectionId: section.id,
                                  blockId: block.id,
                                  itemId: item.id,
                                  mode: 'vocab',
                                  draft: item.term,
                                  extraDraft: item.definition,
                                });
                              }}
                              className={`text-slate-900 ${
                                editable
                                  ? 'cursor-pointer hover:bg-white/35 rounded px-0.5 -mx-0.5'
                                  : ''
                              }`}
                            >
                              <span className="font-bold text-[#DC2626] underline decoration-[#DC2626] underline-offset-2">
                                {item.term}
                              </span>
                              <span> : {item.definition}</span>
                            </p>
                          );
                        })}
                      </div>
                    );
                  }

                  if (block.type === 'diagram') {
                    return (
                      <DiagramRenderer
                        key={block.id}
                        title={block.title}
                        nodes={block.nodes}
                        edges={block.edges}
                        footnote={block.footnote}
                      />
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Subtle overflow indicator on screen only */}
        {((isLeftPanel && leftDensity.isOverflowRisk) ||
          (!isLeftPanel && rightDensity.isOverflowRisk)) && (
          <div className="no-print absolute bottom-1 right-1.5 bg-amber-100 border border-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-[7pt] font-semibold">
            Risque de dépassement · Réduire la police
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative inline-block"
      style={{
        width: `${profile.sheetWidthMm * scale}mm`,
        height: `${profile.sheetHeightMm * scale}mm`,
      }}
    >
      <div
        className="print-sheet-page relative bg-white shadow-[0_8px_30px_rgba(15,23,42,0.10)] border border-slate-200 origin-top-left"
        style={{
          width: `${profile.sheetWidthMm}mm`,
          height: `${profile.sheetHeightMm}mm`,
          transform: `scale(${scale})`,
        }}
      >
        {/* Side labels outside card cut zones */}
        {profile.showSideLabels && (
          <>
            <div
              className="absolute text-[7pt] font-mono-tabular text-slate-400 uppercase tracking-wider"
              style={{
                left: `${geometry.leftCardXMm}mm`,
                top: `${Math.max(2, geometry.cardYMm - 5)}mm`,
              }}
            >
              Recto · {profile.cardWidthMm / 10} × {profile.cardHeightMm / 10} cm
            </div>
            <div
              className="absolute text-[7pt] font-mono-tabular text-slate-400 uppercase tracking-wider"
              style={{
                left: `${geometry.rightCardXMm}mm`,
                top: `${Math.max(2, geometry.cardYMm - 5)}mm`,
              }}
            >
              Verso · {profile.cardWidthMm / 10} × {profile.cardHeightMm / 10} cm
            </div>
          </>
        )}

        {/* Left Card (Recto 14x19 cm) */}
        <div
          className="absolute"
          style={{
            left: `${geometry.leftCardXMm}mm`,
            top: `${geometry.cardYMm}mm`,
          }}
        >
          {profile.showCutMarks && (
            <>
              <span className="pointer-events-none absolute -top-2 -left-2 w-2 h-2 border-t border-l border-slate-400" />
              <span className="pointer-events-none absolute -top-2 -right-2 w-2 h-2 border-t border-r border-slate-400" />
              <span className="pointer-events-none absolute -bottom-2 -left-2 w-2 h-2 border-b border-l border-slate-400" />
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-2 h-2 border-b border-r border-slate-400" />
            </>
          )}
          {renderPanelContent('leftSide', true)}
        </div>

        {/* Right Card (Verso 14x19 cm) */}
        <div
          className="absolute"
          style={{
            left: `${geometry.rightCardXMm}mm`,
            top: `${geometry.cardYMm}mm`,
          }}
        >
          {profile.showCutMarks && (
            <>
              <span className="pointer-events-none absolute -top-2 -left-2 w-2 h-2 border-t border-l border-slate-400" />
              <span className="pointer-events-none absolute -top-2 -right-2 w-2 h-2 border-t border-r border-slate-400" />
              <span className="pointer-events-none absolute -bottom-2 -left-2 w-2 h-2 border-b border-l border-slate-400" />
              <span className="pointer-events-none absolute -bottom-2 -right-2 w-2 h-2 border-b border-r border-slate-400" />
            </>
          )}
          {renderPanelContent('rightSide', false)}
        </div>

        {/* Subtle interactive edit hint */}
        {editable && (
          <div className="no-print absolute bottom-2 right-4 flex items-center gap-1 text-[7.5pt] text-slate-400">
            <Pencil className="w-3 h-3" />
            <span>Cliquez sur n’importe quel texte de la fiche pour le corriger</span>
          </div>
        )}
      </div>
    </div>
  );
};
