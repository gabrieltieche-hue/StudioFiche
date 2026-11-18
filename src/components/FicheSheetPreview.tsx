import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type {
  FicheBlock,
  FicheCard,
  FicheSection,
  PrintProfile,
  TextSpan,
} from '../types/fiche';
import {
  computeAutoSideTypography,
  computeSheetGeometry,
  estimateSideDensity,
  markupToSpans,
  normalizeRomanNumeral,
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

interface EditingTargetState {
  side: 'leftSide' | 'rightSide';
  sectionId: string;
  blockId?: string;
  mode: 'sectionTitle' | 'paragraph' | 'bulletItem' | 'formula' | 'vocab';
  itemId?: string;
  draft: string;
  extraDraft?: string;
}

function expandLegacyItalics(spans: TextSpan[]): TextSpan[] {
  const expanded: TextSpan[] = [];
  const italicRegex = /\*([^\s*](?:[^*\n]*?[^\s*])?)\*/g;
  for (const span of spans) {
    if (!span.text.includes('*')) {
      expanded.push(span);
      continue;
    }
    let last = 0;
    let m: RegExpExecArray | null;
    italicRegex.lastIndex = 0;
    while ((m = italicRegex.exec(span.text)) !== null) {
      if (m.index > last) {
        expanded.push({ ...span, text: span.text.slice(last, m.index) });
      }
      expanded.push({
        ...span,
        text: m[1],
        tone: span.tone && span.tone !== 'normal' ? span.tone : 'italic',
        italic: true,
      });
      last = m.index + m[0].length;
    }
    if (last === 0) {
      expanded.push(span);
    } else if (last < span.text.length) {
      expanded.push({ ...span, text: span.text.slice(last) });
    }
  }
  return expanded;
}

function renderSpans(spans: TextSpan[]) {
  return expandLegacyItalics(spans).map((span, idx) => {
    const italicCls = span.italic ? 'italic ' : '';
    if (span.tone === 'redBold') {
      return (
        <span key={idx} className={`${italicCls}font-semibold text-[#DC2626]`}>
          {span.text}
        </span>
      );
    }
    if (span.tone === 'bold') {
      return (
        <span key={idx} className={`${italicCls}font-bold text-slate-950`}>
          {span.text}
        </span>
      );
    }
    if (span.tone === 'underline') {
      return (
        <span
          key={idx}
          className={`${italicCls}underline decoration-slate-900/85 underline-offset-[2.5px] font-semibold text-slate-950`}
        >
          {span.text}
        </span>
      );
    }
    if (span.tone === 'italic' || span.italic) {
      return (
        <span key={idx} className="italic">
          {span.text}
        </span>
      );
    }
    return <React.Fragment key={idx}>{span.text}</React.Fragment>;
  });
}

interface SideLayoutState {
  fontSizePt: number;
  lineHeight: number;
  sectionGapPx: number;
  blockGapPx: number;
  bulletGapPx: number;
}

interface FicheSidePanelProps {
  card: FicheCard;
  sideKey: 'leftSide' | 'rightSide';
  isLeftPanel: boolean;
  profile: PrintProfile;
  palette: (typeof SUBJECT_PALETTES)[keyof typeof SUBJECT_PALETTES];
  subjectHeaderText: string;
  editable: boolean;
  editingTarget: EditingTargetState | null;
  setEditingTarget: React.Dispatch<React.SetStateAction<EditingTargetState | null>>;
  onSaveEdit: () => void;
  onAddQuickParagraph: (sideKey: 'leftSide' | 'rightSide', sectionId: string) => void;
  onMoveSectionBetweenSides: (fromSide: 'leftSide' | 'rightSide', sectionId: string) => void;
  onDeleteBlock: (sideKey: 'leftSide' | 'rightSide', sectionId: string, blockId: string) => void;
}

const FicheSidePanel: React.FC<FicheSidePanelProps> = ({
  card,
  sideKey,
  isLeftPanel,
  profile,
  palette,
  subjectHeaderText,
  editable,
  editingTarget,
  setEditingTarget,
  onSaveEdit,
  onAddQuickParagraph,
  onMoveSectionBetweenSides,
  onDeleteBlock,
}) => {
  const side = card[sideKey];
  const sideRole = isLeftPanel ? 'recto' : 'verso';
  const isAutoFit = card.autoFillHeight !== false;

  const autoSeed = useMemo(
    () =>
      isAutoFit
        ? computeAutoSideTypography(side, card.fontSizePt, card.lineHeight, sideRole)
        : {
            fontSizePt: card.fontSizePt,
            lineHeight: card.lineHeight,
            sectionGapPx: 12,
            blockGapPx: 6,
            bulletGapPx: 5,
            estimatedUtilizationPercent: estimateSideDensity(
              side,
              card.fontSizePt,
              card.lineHeight,
              sideRole
            ).utilizationPercent,
          },
    [isAutoFit, side, card.fontSizePt, card.lineHeight, sideRole]
  );

  const layoutKey = useMemo(
    () =>
      JSON.stringify({
        id: card.id,
        f: card.fontSizePt,
        l: card.lineHeight,
        a: isAutoFit,
        s: card.visualStyle,
        w: profile.cardWidthMm,
        h: profile.cardHeightMm,
        sideKey,
        secs: side.sections,
      }),
    [
      card.id,
      card.fontSizePt,
      card.lineHeight,
      isAutoFit,
      card.visualStyle,
      profile.cardWidthMm,
      profile.cardHeightMm,
      sideKey,
      side.sections,
    ]
  );

  const [layout, setLayout] = useState<SideLayoutState>(() => ({
    fontSizePt: autoSeed.fontSizePt,
    lineHeight: autoSeed.lineHeight,
    sectionGapPx: autoSeed.sectionGapPx,
    blockGapPx: autoSeed.blockGapPx,
    bulletGapPx: autoSeed.bulletGapPx,
  }));
  const [hasDomOverflow, setHasDomOverflow] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<{
    key: string;
    steps: number;
    hitCeiling: boolean;
  }>({
    key: layoutKey,
    steps: 0,
    hitCeiling: false,
  });

  useLayoutEffect(() => {
    if (controlRef.current.key !== layoutKey) {
      controlRef.current = { key: layoutKey, steps: 0, hitCeiling: false };
      setLayout({
        fontSizePt: autoSeed.fontSizePt,
        lineHeight: autoSeed.lineHeight,
        sectionGapPx: autoSeed.sectionGapPx,
        blockGapPx: autoSeed.blockGapPx,
        bulletGapPx: autoSeed.bulletGapPx,
      });
      return;
    }

    if (editingTarget?.side === sideKey) return;

    const vp = viewportRef.current;
    const ct = contentRef.current;
    if (!vp || !ct || vp.clientHeight <= 20) return;

    const availH = vp.clientHeight;
    const usedH = ct.offsetHeight;
    const overflowPx = usedH - availH;
    const slackPx = availH - usedH;

    setHasDomOverflow(overflowPx > 2);

    if (!isAutoFit || side.sections.length === 0) return;
    if (controlRef.current.steps >= 18) return;

    if (overflowPx > 1) {
      controlRef.current.hitCeiling = true;
      const canTightenGaps =
        layout.sectionGapPx > 9 || layout.blockGapPx > 5 || layout.bulletGapPx > 4;
      const canShrinkFont = layout.fontSizePt > 7.6 || layout.lineHeight > 1.3;

      if (!canTightenGaps && !canShrinkFont) return;

      controlRef.current.steps += 1;
      setLayout((prev) => {
        if (overflowPx <= 16 && (prev.sectionGapPx > 9 || prev.blockGapPx > 5 || prev.bulletGapPx > 4)) {
          return {
            ...prev,
            sectionGapPx: Math.max(9, prev.sectionGapPx - 2),
            blockGapPx: Math.max(5, prev.blockGapPx - 1),
            bulletGapPx: Math.max(4, prev.bulletGapPx - 1),
          };
        }
        const fontStep = overflowPx > 45 ? 0.25 : 0.15;
        return {
          ...prev,
          fontSizePt: Number(Math.max(7.6, prev.fontSizePt - fontStep).toFixed(2)),
          lineHeight: Number(Math.max(1.3, prev.lineHeight - 0.02).toFixed(2)),
          sectionGapPx: Math.max(9, prev.sectionGapPx - 1),
          blockGapPx: Math.max(5, prev.blockGapPx - 1),
        };
      });
      return;
    }

    // Expand if substantial empty bottom space remains (> 18px / ~4.5mm)
    if (slackPx > 18) {
      if (!controlRef.current.hitCeiling && (layout.fontSizePt < 11.9 || layout.lineHeight < 1.56)) {
        controlRef.current.steps += 1;
        const fontStep = slackPx > 85 ? 0.3 : slackPx > 42 ? 0.2 : 0.1;
        const lhStep = slackPx > 75 ? 0.03 : 0.02;
        setLayout((prev) => ({
          fontSizePt: Number(Math.min(12.0, prev.fontSizePt + fontStep).toFixed(2)),
          lineHeight: Number(Math.min(1.58, prev.lineHeight + lhStep).toFixed(2)),
          sectionGapPx: Math.min(32, prev.sectionGapPx + (slackPx > 50 ? 2 : 1)),
          blockGapPx: Math.min(16, prev.blockGapPx + 1),
          bulletGapPx: Math.min(11, prev.bulletGapPx + 1),
        }));
        return;
      }

      // If font hit ceiling (or we just trimmed down from overshoot) and meaningful vertical space remains,
      // distribute part of that space cleanly into vertical rhythm between sections/blocks/bullets.
      const maxSectionGap = side.sections.length >= 2 ? 56 : 28;
      if (
        slackPx > 22 &&
        (layout.sectionGapPx < maxSectionGap || layout.blockGapPx < 18 || layout.bulletGapPx < 12)
      ) {
        controlRef.current.steps += 1;
        const sectionSlots = Math.max(1, side.sections.length - 1);
        const addPerSection = Math.min(10, Math.max(2, Math.floor((slackPx - 12) / (sectionSlots * 2))));
        setLayout((prev) => ({
          ...prev,
          sectionGapPx: Math.min(maxSectionGap, prev.sectionGapPx + addPerSection),
          blockGapPx: Math.min(18, prev.blockGapPx + 1),
          bulletGapPx: Math.min(12, prev.bulletGapPx + 1),
        }));
      }
    }
  }, [layout, layoutKey, autoSeed, isAutoFit, editingTarget, sideKey, side.sections.length]);

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

  const fontClass = card.visualStyle === '3eB' ? 'font-fiche-3eb' : 'font-fiche-2nde';
  const headerPt = Number((layout.fontSizePt * 1.08).toFixed(2));
  const subHeaderPt = Number((layout.fontSizePt * 1.03).toFixed(2));
  const tablePt = Number(Math.max(7.8, layout.fontSizePt * 0.87).toFixed(2));

  return (
    <div
      className={`${fontClass} relative flex flex-col overflow-hidden text-slate-950 select-text`}
      style={{
        width: `${profile.cardWidthMm}mm`,
        height: `${profile.cardHeightMm}mm`,
        padding: '6mm 6.5mm 5.5mm 6.5mm',
        ...gridStyle,
      }}
    >
      {/* Header ONLY on Recto (matches authentic 2ndE & 3eB sheets; Verso starts directly with its first section) */}
      {isLeftPanel && (
        <div className="mb-2.5 shrink-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9.5pt] font-semibold underline decoration-slate-900 underline-offset-[2.5px]">
              {card.className}
            </span>
            <span
              className={`text-center tracking-[0.02em] ${
                card.visualStyle === '3eB'
                  ? `${subjectHeaderText.length > 20 ? 'text-[11.5pt]' : 'text-[14pt]'} font-extrabold fiche-3eb-title-outline`
                  : 'text-[11.2pt] font-bold text-slate-950 uppercase'
              }`}
            >
              {subjectHeaderText}
            </span>
            <span className="text-[9.5pt] font-semibold underline decoration-slate-900 underline-offset-[2.5px]">
              {card.dateLabel}
            </span>
          </div>
          <div
            className={`text-center font-bold mt-0.5 leading-snug text-[9.4pt] ${
              card.visualStyle === '3eB'
                ? 'underline decoration-slate-900 underline-offset-2'
                : ''
            }`}
          >
            {card.title}
          </div>
        </div>
      )}

      {/* Sections viewport */}
      <div
        ref={viewportRef}
        data-side-viewport={sideRole}
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          fontSize: `${layout.fontSizePt}pt`,
          lineHeight: layout.lineHeight,
        }}
      >
        <div
          ref={contentRef}
          data-side-content={sideRole}
          className="flex flex-col"
          style={{ gap: `${layout.sectionGapPx}px` }}
        >
          {side.sections.map((section, secIdx) => (
            <div key={section.id || `sec-${secIdx}`} className="group/sec relative">
              <div className="flex items-center justify-between gap-1 mb-1">
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
                      onClick={onSaveEdit}
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
                    style={{ fontSize: `${section.isSubHeader ? subHeaderPt : headerPt}pt` }}
                    className={`font-bold text-[#1D4ED8] underline decoration-[#1D4ED8] underline-offset-[3px] leading-snug ${
                      editable ? 'cursor-pointer hover:bg-white/30 rounded px-0.5 -mx-0.5' : ''
                    }`}
                  >
                    {normalizeRomanNumeral(section.romanNumeral)} {section.title}
                  </h4>
                )}

                {editable && (
                  <div className="no-print opacity-0 group-hover/sec:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAddQuickParagraph(sideKey, section.id)}
                      title="Ajouter un paragraphe"
                      aria-label={`Ajouter un bloc dans ${section.title}`}
                      className="p-0.5 rounded bg-white/80 hover:bg-white text-slate-700 border border-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveSectionBetweenSides(sideKey, section.id)}
                      title={isLeftPanel ? 'Basculer vers Verso' : 'Basculer vers Recto'}
                      aria-label={`Déplacer ${section.title} vers ${isLeftPanel ? 'Verso' : 'Recto'}`}
                      className="p-0.5 rounded bg-white/80 hover:bg-white text-slate-700 border border-slate-300"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col" style={{ gap: `${layout.blockGapPx}px` }}>
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
                            <span>Astuce : [rouge]mot[/rouge], **gras**, __souligné__, *italique*</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={onSaveEdit}
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
                            onClick={() => onDeleteBlock(sideKey, section.id, block.id)}
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
                      <ul
                        key={block.id || `blk-${blkIdx}`}
                        className="flex flex-col"
                        style={{ gap: `${layout.bulletGapPx}px` }}
                      >
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
                                    onClick={onSaveEdit}
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
                                item.level === 2 ? 'pl-3.5' : `pl-0.5 ${itmIdx > 0 ? 'pt-0.5' : ''}`
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
                              onClick={onSaveEdit}
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
                        className={`my-1 rounded-xl bg-white/46 border border-slate-900/12 px-3 py-1.5 text-center ${
                          editable ? 'cursor-pointer hover:bg-white/65' : ''
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
                      <div
                        key={block.id}
                        className="my-1.5 overflow-hidden rounded-lg border border-slate-900/16 bg-white/62 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      >
                        <table
                          className="w-full border-collapse leading-[1.35]"
                          style={{ fontSize: `${tablePt}pt` }}
                        >
                          <thead>
                            <tr className="bg-white/88 border-b border-slate-900/14 divide-x divide-slate-900/[0.06]">
                              {block.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="px-2.5 py-1.5 text-left font-bold text-slate-950 align-middle tracking-[0.01em]"
                                >
                                  {renderSpans(markupToSpans(h))}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className="border-b border-slate-900/[0.07] last:border-b-0 divide-x divide-slate-900/[0.06] odd:bg-white/25 even:bg-white/55"
                              >
                                {row.map((cell, cIdx) => {
                                  const plainCell = cell
                                    .replace(/\[\/?rouge\]|\*\*|__|\*/g, '')
                                    .trim();
                                  const isShortCodeOrNum =
                                    plainCell.length <= 10 &&
                                    !plainCell.includes(',') &&
                                    !plainCell.includes(';');
                                  return (
                                    <td
                                      key={cIdx}
                                      className={`px-2.5 py-1.5 align-top text-slate-800 ${
                                        cIdx === 0 ? 'font-semibold text-slate-950' : ''
                                      } ${isShortCodeOrNum ? 'whitespace-nowrap font-mono-tabular' : ''}`}
                                    >
                                      {renderSpans(markupToSpans(cell))}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (block.type === 'vocabList') {
                    return (
                      <ul
                        key={block.id}
                        className="flex flex-col"
                        style={{ gap: `${layout.bulletGapPx}px` }}
                      >
                        {block.items.map((item) => {
                          const isEditing =
                            editingTarget?.blockId === block.id &&
                            editingTarget.itemId === item.id &&
                            editingTarget.mode === 'vocab';
                          if (isEditing) {
                            return (
                              <li
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
                                    onClick={onSaveEdit}
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
                                  mode: 'vocab',
                                  draft: item.term,
                                  extraDraft: item.definition,
                                });
                              }}
                              className={`flex items-start gap-1.5 pl-0.5 text-slate-900 ${
                                editable
                                  ? 'cursor-pointer hover:bg-white/35 rounded px-0.5 -mx-0.5'
                                  : ''
                              }`}
                            >
                              <span className="shrink-0 font-bold text-slate-900">•</span>
                              <span>
                                <span className="font-semibold underline decoration-slate-900/85 underline-offset-[2.5px] text-slate-950">
                                  {item.term} :
                                </span>{' '}
                                <span>{renderSpans(markupToSpans(item.definition))}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }

                  if (block.type === 'diagram') {
                    return (
                      <DiagramRenderer
                        key={block.id}
                        title={block.title}
                        nodes={block.nodes}
                        edges={block.edges}
                        groups={block.groups}
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
      </div>

      {/* Real DOM overflow indicator on screen only */}
      {hasDomOverflow && (
        <div className="no-print absolute bottom-1 right-1.5 bg-amber-100 border border-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-[7pt] font-semibold">
          Risque de dépassement · Réduire la police
        </div>
      )}
    </div>
  );
};

export const FicheSheetPreview: React.FC<FicheSheetPreviewProps> = ({
  card,
  profile,
  scale = 1,
  editable = true,
  onUpdateCard,
}) => {
  const [editingTarget, setEditingTarget] = useState<EditingTargetState | null>(null);

  const geometry = computeSheetGeometry(profile);
  const palette = SUBJECT_PALETTES[card.subject];
  const subjectHeaderText =
    card.customSubjectLabel?.trim() || palette.headerDisplay || card.subject.toUpperCase();

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
          <FicheSidePanel
            card={card}
            sideKey="leftSide"
            isLeftPanel={true}
            profile={profile}
            palette={palette}
            subjectHeaderText={subjectHeaderText}
            editable={editable}
            editingTarget={editingTarget}
            setEditingTarget={setEditingTarget}
            onSaveEdit={handleSaveEdit}
            onAddQuickParagraph={addQuickParagraph}
            onMoveSectionBetweenSides={moveSectionBetweenSides}
            onDeleteBlock={deleteBlock}
          />
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
          <FicheSidePanel
            card={card}
            sideKey="rightSide"
            isLeftPanel={false}
            profile={profile}
            palette={palette}
            subjectHeaderText={subjectHeaderText}
            editable={editable}
            editingTarget={editingTarget}
            setEditingTarget={setEditingTarget}
            onSaveEdit={handleSaveEdit}
            onAddQuickParagraph={addQuickParagraph}
            onMoveSectionBetweenSides={moveSectionBetweenSides}
            onDeleteBlock={deleteBlock}
          />
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
