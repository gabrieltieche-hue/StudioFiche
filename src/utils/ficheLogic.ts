import type {
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  FicheCard,
  FicheDeck,
  MetaPromptPreset,
  PrintProfile,
  SubjectKey,
  SubjectPalette,
  TextSpan,
} from '../types/fiche';

export const SUBJECT_PALETTES: Record<SubjectKey, SubjectPalette> = {
  SVT: {
    key: 'SVT',
    label: 'SVT',
    headerDisplay: 'SCIENCES DE LA VIE ET DE LA TERRE',
    backgroundHex: '#F3CBD5',
    gridLineHex: '#DFB0BC',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  'Physique-Chimie': {
    key: 'Physique-Chimie',
    label: 'Physique-Chimie',
    headerDisplay: 'PHYSIQUE-CHIMIE',
    backgroundHex: '#CBEAD4',
    gridLineHex: '#AFD4BA',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Français: {
    key: 'Français',
    label: 'Français',
    headerDisplay: 'FRANÇAIS',
    backgroundHex: '#C4DFEE',
    gridLineHex: '#A7CADF',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Histoire: {
    key: 'Histoire',
    label: 'Histoire',
    headerDisplay: 'HISTOIRE',
    backgroundHex: '#F5E9A3',
    gridLineHex: '#DDD086',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Géographie: {
    key: 'Géographie',
    label: 'Géographie',
    headerDisplay: 'GÉOGRAPHIE',
    backgroundHex: '#D5ECCB',
    gridLineHex: '#B8D7AB',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  EMC: {
    key: 'EMC',
    label: 'EMC',
    headerDisplay: 'ÉDUCATION MORALE ET CIVIQUE',
    backgroundHex: '#F5E9A3',
    gridLineHex: '#DDD086',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Mathématiques: {
    key: 'Mathématiques',
    label: 'Mathématiques',
    headerDisplay: 'MATHÉMATIQUES',
    backgroundHex: '#D7E1F5',
    gridLineHex: '#B7C7E6',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Espagnol: {
    key: 'Espagnol',
    label: 'Espagnol',
    headerDisplay: 'ESPAGNOL',
    backgroundHex: '#F6D6C9',
    gridLineHex: '#E0B9AA',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Anglais: {
    key: 'Anglais',
    label: 'Anglais',
    headerDisplay: 'ANGLAIS',
    backgroundHex: '#E4D8F4',
    gridLineHex: '#CCBBE3',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
  Autre: {
    key: 'Autre',
    label: 'Autre matière',
    headerDisplay: 'COURS',
    backgroundHex: '#E5E7EB',
    gridLineHex: '#CBD5E1',
    sectionBlueHex: '#1D4ED8',
    accentRedHex: '#DC2626',
  },
};

export const DEFAULT_PRINT_PROFILE: PrintProfile = {
  id: 'a4-landscape-14x19',
  name: 'A4 Paysage — Recto + Verso (14 × 19 cm)',
  sheetWidthMm: 297,
  sheetHeightMm: 210,
  cardWidthMm: 140,
  cardHeightMm: 190,
  gutterMm: 5,
  showCutMarks: true,
  showSideLabels: true,
  defaultVisualStyle: '2ndE',
};

export const DEFAULT_META_PROMPT_TEMPLATE = `<Ancrage>
Tu es un expert en ingénierie de prompts et en pédagogie. Ta mission est de générer un ou plusieurs prompts ultra-performants pour permettre à un élève de {CLASSE} de créer des fiches de révisions exhaustives, fidèles et parfaitement structurées sur : {SUJET} pour réviser ce chapitre / contrôle.
</Ancrage>

<Lien>
En te basant EXCLUSIVEMENT sur les sources PDF fournies en pièce jointe (cours et manuel éventuel), sans jamais inventer ni omettre d'informations clés des documents, dresse l'inventaire complet page par page puis génère le contenu complet de chaque fiche.
</Lien>

<Rôle>
Agis en tant que Concepteur Pédagogique et expert dans la matière : {MATIERE}.
</Rôle>

<Objectif>
Génère des fiches de révision complètes sur le sujet suivant : {SUJET}.
Les fiches générées doivent couvrir 100 % des notions, dates, acteurs, exemples, définitions et formules présents dans les PDF en pièce jointe.
</Objectif>

<Format_du_Prompt Généré>
Chaque fiche planifiée doit suivre ce modèle :
1. Titre : "Prompt sur [Sujet]"
2. Instruction principale : "Rédige une fiche de révision structurée et complète sur [Sujet]. La fiche doit inclure :"
3. Liste à puces détaillant tous les points clés (phases, acteurs, dates, définitions, mécanismes, formules, exemples).
</Format_du_Prompt Généré>

<Contraintes de Rédaction>
- Adopte un rôle d'expert pour la matière (ex: historien, biologiste, physicien, professeur de français).
- Ton clair, synthétique, précis et aéré, remplissant ~82–92 % de chaque face 14 × 19 cm (Recto + Verso), sans jamais déborder ni copier-coller de longs pavés.
- Chaque fiche doit être structurée en 3 ou 4 parties numérotées I., II., III., et IV. À retenir / Vocabulaire ou Schéma-bilan.
- Adapte le nombre de fiches à la richesse réelle du chapitre (2 à 4 fiches si le cours + manuel est dense, jamais de fiche surchargée).
- Mets en évidence en rouge gras les notions, phrases-clés, mécanismes et définitions cruciales (et pas uniquement des dates isolées).
- Si le cours contient des schémas fonctionnels, cycles, hiérarchies ou tableaux essentiels, inclus-les proprement de façon compacte.
</Contraintes de Rédaction>`;

export const DEFAULT_META_PROMPT_PRESETS: MetaPromptPreset[] = [
  {
    id: 'preset-notebooklm-officiel',
    name: 'Méta-Prompt NotebookLM (Standard)',
    description:
      'Votre méthode exacte en 2 temps : génération des prompts par thème puis rédaction structurée en 3-4 parties strictement ancrée sur les PDF.',
    template: DEFAULT_META_PROMPT_TEMPLATE,
    defaultCardCount: 'auto',
    updatedAt: '2026-11-14T00:00:00.000Z',
  },
  {
    id: 'preset-controle-2-fiches',
    name: 'Mode Contrôle Express (2 fiches max)',
    description:
      'Variante condensée limitée à 2 fiches recto-verso maximum, idéale pour réviser un contrôle ciblé.',
    template:
      DEFAULT_META_PROMPT_TEMPLATE +
      '\n\nPS : Pour cette session, sors-moi exactement 2 fiches maximum couvrant tout l’essentiel du cours.',
    defaultCardCount: '2',
    updatedAt: '2026-11-14T00:00:00.000Z',
  },
];

export interface SheetLayoutGeometry {
  fitsOnSheet: boolean;
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  totalContentWidthMm: number;
  leftCardXMm: number;
  rightCardXMm: number;
  cardYMm: number;
}

export function computeSheetGeometry(profile: PrintProfile): SheetLayoutGeometry {
  const totalContentWidthMm = profile.cardWidthMm * 2 + profile.gutterMm;
  const horizontalMargin = (profile.sheetWidthMm - totalContentWidthMm) / 2;
  const verticalMargin = (profile.sheetHeightMm - profile.cardHeightMm) / 2;

  const fitsOnSheet =
    horizontalMargin >= 0 &&
    verticalMargin >= 0 &&
    profile.cardWidthMm > 0 &&
    profile.cardHeightMm > 0;

  return {
    fitsOnSheet,
    marginLeftMm: Number(horizontalMargin.toFixed(2)),
    marginRightMm: Number(horizontalMargin.toFixed(2)),
    marginTopMm: Number(verticalMargin.toFixed(2)),
    marginBottomMm: Number(verticalMargin.toFixed(2)),
    totalContentWidthMm: Number(totalContentWidthMm.toFixed(2)),
    leftCardXMm: Number(horizontalMargin.toFixed(2)),
    rightCardXMm: Number((horizontalMargin + profile.cardWidthMm + profile.gutterMm).toFixed(2)),
    cardYMm: Number(verticalMargin.toFixed(2)),
  };
}

export function buildCompiledMetaPrompt(params: {
  template: string;
  className: string;
  subject: SubjectKey;
  topic: string;
  cardCount: 'auto' | '1' | '2' | '3' | '4';
  extraInstructions?: string;
}): string {
  const subjectLabel = SUBJECT_PALETTES[params.subject]?.label ?? params.subject;
  let compiled = params.template
    .replaceAll('{CLASSE}', params.className || '2ndE')
    .replaceAll('{MATIERE}', subjectLabel)
    .replaceAll('{SUJET}', params.topic || 'le cours fourni en pièce jointe')
    .replaceAll('{PARTIE DE L’ANNEE}', params.topic || 'ce chapitre');

  if (params.cardCount !== 'auto') {
    compiled += `\n\n[CONTRAINTE DE NOMBRE DE FICHES] : Génère exactement ${params.cardCount} fiche(s) recto-verso.`;
  }

  if (params.extraInstructions?.trim()) {
    compiled += `\n\n[CONSIGNE SUPPLÉMENTAIRE DE L'ÉLÈVE] : ${params.extraInstructions.trim()}`;
  }

  return compiled;
}

export function normalizeRomanNumeral(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/[.)°:\-]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

export function estimateSideDensity(
  side: FicheCard['leftSide'],
  fontSizePt: number,
  lineHeight: number,
  sideRole: 'recto' | 'verso' = 'recto'
): { estimatedChars: number; utilizationPercent: number; isOverflowRisk: boolean } {
  let chars = 0;
  let blockWeight = 0;

  for (const section of side.sections) {
    chars += section.title.length + 12;
    blockWeight += 28;
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        const textLen = block.spans.reduce((acc, s) => acc + s.text.length, 0);
        chars += textLen;
        blockWeight += Math.ceil(textLen / 79) * 16.0 + 5.5;
      } else if (block.type === 'bulletList') {
        for (const item of block.items) {
          const textLen = item.spans.reduce((acc, s) => acc + s.text.length, 0);
          chars += textLen;
          blockWeight += Math.ceil(textLen / 75) * 16.0 + 4.8;
        }
      } else if (block.type === 'formulaBox') {
        chars += block.formula.length + (block.caption?.length ?? 0);
        blockWeight += 48;
      } else if (block.type === 'table') {
        chars += block.rows.length * 48;
        blockWeight += 32 + block.rows.length * 23;
      } else if (block.type === 'vocabList') {
        for (const item of block.items) {
          const defPlain = item.definition.replace(/\[\/?rouge\]/g, '');
          chars += item.term.length + defPlain.length;
          blockWeight += Math.ceil((item.term.length + defPlain.length) / 76) * 16.0 + 5;
        }
      } else if (block.type === 'diagram') {
        chars += block.nodes.length * 16;
        blockWeight += Math.min(235, 110 + block.nodes.length * 18);
      }
    }
  }

  // Calibrated against measured Chromium render on 140x190mm (480px width; ~665px Recto, ~725px Verso)
  const scaleFactor = (fontSizePt / 9.0) * (lineHeight / 1.34);
  const adjustedWeight = blockWeight * scaleFactor;
  const maxCapacity = sideRole === 'verso' ? 725 : 665;
  const utilizationPercent = Math.round((adjustedWeight / maxCapacity) * 100);

  return {
    estimatedChars: chars,
    utilizationPercent,
    isOverflowRisk: utilizationPercent > 100,
  };
}

export function spansToPlainText(spans: TextSpan[]): string {
  return spans.map((s) => s.text).join('');
}

export function spansToMarkup(spans: TextSpan[]): string {
  return spans
    .map((s) => {
      if (s.tone === 'redBold') return `[rouge]${s.text}[/rouge]`;
      if (s.tone === 'bold') return s.italic ? `***${s.text}***` : `**${s.text}**`;
      if (s.tone === 'underline') return s.italic ? `__*${s.text}*__` : `__${s.text}__`;
      if (s.tone === 'italic' || s.italic) return `*${s.text}*`;
      return s.text;
    })
    .join('');
}

function splitNestedInside(
  content: string,
  baseTone: NonNullable<TextSpan['tone']>
): TextSpan[] {
  const parts: TextSpan[] = [];
  const nestedRegex = /(\[rouge\][\s\S]*?\[\/rouge\]|\*[^\s*](?:[^*\n]*?[^\s*])?\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = nestedRegex.exec(content)) !== null) {
    if (m.index > last) {
      const before = content.slice(last, m.index).replace(/\[\/?rouge\]/g, '');
      if (before) parts.push({ text: before, tone: baseTone });
    }
    const token = m[0];
    if (token.startsWith('[rouge]') && token.endsWith('[/rouge]')) {
      const inner = token.slice(7, -8).replace(/\[\/?rouge\]/g, '');
      if (inner) parts.push({ text: inner, tone: 'redBold' });
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 3) {
      const inner = token.slice(1, -1).replace(/\[\/?rouge\]/g, '');
      if (inner) {
        if (baseTone === 'underline' || baseTone === 'bold') {
          parts.push({ text: inner, tone: baseTone, italic: true });
        } else {
          parts.push({ text: inner, tone: 'italic' });
        }
      }
    }
    last = m.index + token.length;
  }

  if (last < content.length) {
    const rest = content.slice(last).replace(/\[\/?rouge\]/g, '');
    if (rest) parts.push({ text: rest, tone: baseTone });
  }

  return parts.length > 0
    ? parts
    : [{ text: content.replace(/\[\/?rouge\]/g, ''), tone: baseTone }];
}

export function markupToSpans(input: string): TextSpan[] {
  const safeInput = input || '';
  const tokens: TextSpan[] = [];
  const regex =
    /(\[rouge\][\s\S]*?\[\/rouge\]|\*\*\*[\s\S]*?\*\*\*|\*\*[\s\S]*?\*\*|__[\s\S]*?__|\*[^\s*](?:[^*\n]*?[^\s*])?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(safeInput)) !== null) {
    if (match.index > lastIndex) {
      const plain = safeInput.slice(lastIndex, match.index).replace(/\[\/?rouge\]/g, '');
      if (plain) tokens.push({ text: plain, tone: 'normal' });
    }
    const raw = match[0];
    if (raw.startsWith('[rouge]') && raw.endsWith('[/rouge]')) {
      tokens.push({ text: raw.slice(7, -8).replace(/\[\/?rouge\]/g, ''), tone: 'redBold' });
    } else if (raw.startsWith('***') && raw.endsWith('***') && raw.length > 6) {
      tokens.push({ text: raw.slice(3, -3).replace(/\[\/?rouge\]/g, ''), tone: 'bold', italic: true });
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push(...splitNestedInside(raw.slice(2, -2), 'bold'));
    } else if (raw.startsWith('__') && raw.endsWith('__')) {
      tokens.push(...splitNestedInside(raw.slice(2, -2), 'underline'));
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push(...splitNestedInside(raw.slice(1, -1), 'italic'));
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < safeInput.length) {
    const tail = safeInput.slice(lastIndex).replace(/\[\/?rouge\]/g, '');
    if (tail) tokens.push({ text: tail, tone: 'normal' });
  }
  return tokens.length > 0
    ? tokens
    : [{ text: safeInput.replace(/\[\/?rouge\]/g, ''), tone: 'normal' }];
}

export function formatDateShort(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function normalizeSide(
  rawSide: unknown,
  cardIdx: number,
  sideTag: 'L' | 'R'
): FicheCard['leftSide'] {
  const obj = rawSide as { sections?: Array<Record<string, unknown>> } | undefined;
  const rawSections = Array.isArray(obj?.sections) ? obj.sections : [];
  const defaultNumerals = ['I.', 'II.', 'III.', 'IV.', 'V.'];

  return {
    sections: rawSections.map((sec, sIdx) => {
      const rawBlocks = Array.isArray(sec.blocks) ? (sec.blocks as Array<Record<string, unknown>>) : [];
      return {
        id: typeof sec.id === 'string' && sec.id ? sec.id : `sec-${cardIdx}-${sideTag}-${sIdx}`,
        romanNumeral:
          typeof sec.romanNumeral === 'string'
            ? sec.romanNumeral
            : typeof sec.numeral === 'string'
              ? sec.numeral
              : defaultNumerals[sIdx] ?? `${sIdx + 1}.`,
        title: typeof sec.title === 'string' ? sec.title : `Partie ${sIdx + 1}`,
        isSubHeader: Boolean(sec.isSubHeader),
        blocks: rawBlocks.map((blk, bIdx) => {
          const blkId =
            typeof blk.id === 'string' && blk.id
              ? blk.id
              : `blk-${cardIdx}-${sideTag}-${sIdx}-${bIdx}`;
          const rawType = blk.type === 'bullets' ? 'bulletList' : blk.type;

          if (rawType === 'bulletList') {
            const rawItems = Array.isArray(blk.items)
              ? (blk.items as Array<Record<string, unknown>>)
              : [];
            return {
              id: blkId,
              type: 'bulletList' as const,
              items: rawItems.map((itm, iIdx) => ({
                id:
                  typeof itm.id === 'string' && itm.id
                    ? itm.id
                    : `itm-${cardIdx}-${sideTag}-${sIdx}-${bIdx}-${iIdx}`,
                level: itm.level === 2 ? (2 as const) : (1 as const),
                spans: Array.isArray(itm.spans) ? (itm.spans as TextSpan[]) : [{ text: '' }],
              })),
            };
          }

          if (rawType === 'formulaBox') {
            return {
              id: blkId,
              type: 'formulaBox' as const,
              title: typeof blk.title === 'string' ? blk.title : undefined,
              formula: typeof blk.formula === 'string' ? blk.formula : '',
              caption: typeof blk.caption === 'string' ? blk.caption : undefined,
            };
          }

          if (rawType === 'table') {
            return {
              id: blkId,
              type: 'table' as const,
              headers: Array.isArray(blk.headers) ? (blk.headers as string[]) : [],
              rows: Array.isArray(blk.rows) ? (blk.rows as string[][]) : [],
            };
          }

          if (rawType === 'vocabList') {
            const rawVocab = Array.isArray(blk.items)
              ? (blk.items as Array<{ id?: string; term?: string; definition?: string }>)
              : [];
            return {
              id: blkId,
              type: 'vocabList' as const,
              items: rawVocab.map((v, vIdx) => ({
                id: typeof v.id === 'string' && v.id ? v.id : `voc-${cardIdx}-${sideTag}-${sIdx}-${bIdx}-${vIdx}`,
                term: v.term || '',
                definition: v.definition || '',
              })),
            };
          }

          if (rawType === 'diagram') {
            const sanitized = sanitizeDiagramData({
              title: typeof blk.title === 'string' && blk.title ? blk.title : 'Schéma',
              nodes: Array.isArray(blk.nodes) ? blk.nodes : [],
              edges: Array.isArray(blk.edges) ? blk.edges : [],
              groups: Array.isArray(blk.groups) ? blk.groups : undefined,
              footnote: typeof blk.footnote === 'string' ? blk.footnote : undefined,
            });
            return {
              id: blkId,
              type: 'diagram' as const,
              ...sanitized,
            };
          }

          return {
            id: blkId,
            type: 'paragraph' as const,
            spans: Array.isArray(blk.spans) ? (blk.spans as TextSpan[]) : [{ text: '' }],
          };
        }),
      };
    }),
  };
}

export function parseDeckFromJsonInput(rawJson: string): FicheDeck {
  const cleaned = rawJson
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Omit<Partial<FicheDeck>, 'cards'> & {
    classLabel?: string;
    cards?: Array<
      Partial<FicheCard> & {
        classLabel?: string;
        recto?: unknown;
        verso?: unknown;
      }
    >;
  };

  if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('Le JSON doit contenir un tableau "cards" avec au moins une fiche.');
  }

  const now = new Date().toISOString();
  const firstCard = parsed.cards[0];
  const deckSubjectRaw = firstCard.subject || parsed.subject;
  const subject: SubjectKey =
    deckSubjectRaw && deckSubjectRaw in SUBJECT_PALETTES ? (deckSubjectRaw as SubjectKey) : 'Autre';

  const normalizedCards: FicheCard[] = parsed.cards.map((card, idx) => {
    const cardSubject: SubjectKey =
      card.subject && card.subject in SUBJECT_PALETTES ? card.subject : subject;
    const palette = SUBJECT_PALETTES[cardSubject];
    return {
      id: card.id || `card-${Date.now()}-${idx}`,
      index: idx + 1,
      className: card.className || card.classLabel || parsed.className || parsed.classLabel || '2ndE',
      subject: cardSubject,
      customSubjectLabel: card.customSubjectLabel,
      dateLabel: card.dateLabel || parsed.dateLabel || formatDateShort(),
      title: card.title || `Fiche ${idx + 1}`,
      generatedPrompt: card.generatedPrompt,
      backgroundHex: card.backgroundHex || palette.backgroundHex,
      visualStyle: card.visualStyle === '3eB' ? '3eB' : '2ndE',
      fontSizePt: typeof card.fontSizePt === 'number' ? card.fontSizePt : 9.2,
      lineHeight: typeof card.lineHeight === 'number' ? card.lineHeight : 1.35,
      autoFillHeight: card.autoFillHeight !== false,
      leftSide: normalizeSide(card.leftSide ?? card.recto, idx, 'L'),
      rightSide: normalizeSide(card.rightSide ?? card.verso, idx, 'R'),
    };
  });

  return {
    id: parsed.id || `deck-${Date.now()}`,
    title: parsed.title || normalizedCards[0].title,
    className: parsed.className || parsed.classLabel || normalizedCards[0].className,
    subject,
    dateLabel: parsed.dateLabel || normalizedCards[0].dateLabel,
    sourceFileNames: Array.isArray(parsed.sourceFileNames) ? parsed.sourceFileNames : ['Import JSON'],
    metaPromptName: parsed.metaPromptName || 'Import direct',
    cards: normalizedCards,
    createdAt: parsed.createdAt || now,
    updatedAt: now,
  };
}

function normalizeDiagramTone(rawTone: unknown): NonNullable<DiagramNode['tone']> {
  const t = String(rawTone || '').trim().toLowerCase();
  if (t === 'blue' || t === 'bleu') return 'blue';
  if (t === 'amber' || t === 'yellow' || t === 'orange' || t === 'jaune') return 'amber';
  if (t === 'green' || t === 'vert') return 'green';
  if (t === 'red' || t === 'rouge') return 'red';
  if (t === 'slate' || t === 'gray' || t === 'grey' || t === 'gris' || t === 'dark' || t === 'noir') {
    return 'slate';
  }
  return 'blue';
}

export function sanitizeDiagramData(raw: {
  title?: unknown;
  nodes?: unknown[];
  edges?: unknown[];
  groups?: unknown[];
  footnote?: unknown;
}): {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  footnote?: string;
} {
  const title =
    typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Schéma-bilan';
  const footnote =
    typeof raw.footnote === 'string' && raw.footnote.trim() ? raw.footnote.trim() : undefined;

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
  const rawGroups = Array.isArray(raw.groups) ? raw.groups : [];

  const numericCandidates = rawNodes
    .map((n) => n as Record<string, unknown>)
    .filter((n) => n && typeof n === 'object');

  const usesUnitCoords =
    numericCandidates.length > 0 &&
    numericCandidates.every(
      (n) => Number(n.x) >= 0 && Number(n.x) <= 1.05 && Number(n.y) >= 0 && Number(n.y) <= 1.05
    );

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const nodes: DiagramNode[] = numericCandidates.map((n, idx) => {
    const rawX = Number(n.x);
    const rawY = Number(n.y);
    const fallbackX = idx % 2 === 0 ? 28 : 72;
    const fallbackY = 18 + Math.floor(idx / 2) * 28;
    const scaledX = Number.isFinite(rawX) ? (usesUnitCoords ? rawX * 100 : rawX) : fallbackX;
    const scaledY = Number.isFinite(rawY) ? (usesUnitCoords ? rawY * 100 : rawY) : fallbackY;
    const rawW = Number(n.width);
    return {
      id: typeof n.id === 'string' && n.id.trim() ? n.id.trim() : `node-${idx}`,
      label: typeof n.label === 'string' && n.label.trim() ? n.label.trim() : `Élément ${idx + 1}`,
      sublabel: typeof n.sublabel === 'string' && n.sublabel.trim() ? n.sublabel.trim() : undefined,
      x: clamp(scaledX, 12, 88),
      y: clamp(scaledY, 8, 94),
      width: Number.isFinite(rawW) ? clamp(rawW, 24, 52) : 34,
      tone: normalizeDiagramTone(n.tone),
    };
  });

  // Resolve overlapping nodes gently
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = Math.abs(nodes[j].x - nodes[i].x);
      const dy = Math.abs(nodes[j].y - nodes[i].y);
      if (dx < 24 && dy < 16) {
        if (nodes[j].y + 18 <= 92) {
          nodes[j].y = clamp(nodes[i].y + 20, 8, 94);
        } else {
          nodes[j].x = clamp(nodes[i].x < 50 ? nodes[i].x + 34 : nodes[i].x - 34, 12, 88);
        }
      }
    }
  }

  const findNodeId = (ref: unknown): string | null => {
    const key = String(ref ?? '').trim();
    if (!key) return null;
    const byId = nodes.find((n) => n.id === key);
    if (byId) return byId.id;
    const lower = key.toLowerCase();
    const byLabel = nodes.find((n) => n.label.toLowerCase() === lower);
    return byLabel ? byLabel.id : null;
  };

  const edges: DiagramEdge[] = rawEdges
    .map((e) => e as Record<string, unknown>)
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const from = findNodeId(e.from);
      const to = findNodeId(e.to);
      if (!from || !to || from === to) return null;
      return {
        from,
        to,
        label: typeof e.label === 'string' && e.label.trim() ? e.label.trim() : undefined,
        dashed: Boolean(e.dashed),
      } as DiagramEdge;
    })
    .filter((e): e is DiagramEdge => e !== null);

  const groups: DiagramGroup[] = rawGroups
    .map((g, idx): DiagramGroup | null => {
      const rec = g as Record<string, unknown>;
      if (!rec || typeof rec !== 'object') return null;
      const nodeIds = Array.isArray(rec.nodeIds)
        ? rec.nodeIds.map((nid) => findNodeId(nid)).filter((id): id is string => Boolean(id))
        : [];
      if (nodeIds.length === 0) return null;
      return {
        id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `grp-${idx}`,
        title: typeof rec.title === 'string' && rec.title.trim() ? rec.title.trim() : 'Groupe',
        subtitle: typeof rec.subtitle === 'string' && rec.subtitle.trim() ? rec.subtitle.trim() : undefined,
        nodeIds,
        tone: normalizeDiagramTone(rec.tone),
      };
    })
    .filter((g): g is DiagramGroup => g !== null);

  return {
    title,
    nodes,
    edges,
    ...(groups.length > 0 ? { groups } : {}),
    footnote,
  };
}

export interface AutoSideTypography {
  fontSizePt: number;
  lineHeight: number;
  sectionGapPx: number;
  blockGapPx: number;
  bulletGapPx: number;
  estimatedUtilizationPercent: number;
}

export function computeAutoSideTypography(
  side: FicheCard['leftSide'],
  baseFontSizePt: number,
  baseLineHeight: number,
  sideRole: 'recto' | 'verso' = 'recto'
): AutoSideTypography {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  let font = Number(clamp(baseFontSizePt, 7.6, 12.0).toFixed(2));
  let lh = Number(clamp(baseLineHeight, 1.22, 1.54).toFixed(2));

  if (!side.sections || side.sections.length === 0) {
    return {
      fontSizePt: font,
      lineHeight: lh,
      sectionGapPx: 12,
      blockGapPx: 6,
      bulletGapPx: 4,
      estimatedUtilizationPercent: 0,
    };
  }

  let density = estimateSideDensity(side, font, lh, sideRole);

  // Step down if overflowing (> 98%)
  for (let i = 0; i < 18 && density.utilizationPercent > 98; i += 1) {
    if (font <= 7.6 && lh <= 1.22) break;
    if (font > 7.6) font = Number(Math.max(7.6, font - 0.2).toFixed(2));
    if (lh > 1.22) lh = Number(Math.max(1.22, lh - 0.02).toFixed(2));
    density = estimateSideDensity(side, font, lh, sideRole);
  }

  // Step up independently on sparse sides (< 92%) so text is larger & fills the 14x19cm page
  for (let i = 0; i < 20 && density.utilizationPercent < 92; i += 1) {
    if (font >= 12.0 && lh >= 1.54) break;
    const nextFont = font < 12.0 ? Number(Math.min(12.0, font + 0.2).toFixed(2)) : font;
    const nextLh = lh < 1.54 ? Number(Math.min(1.54, lh + 0.02).toFixed(2)) : lh;
    const cand = estimateSideDensity(side, nextFont, nextLh, sideRole);
    if (cand.utilizationPercent > 96) {
      const halfFont = font < 12.0 ? Number(Math.min(12.0, font + 0.1).toFixed(2)) : font;
      const halfCand = estimateSideDensity(side, halfFont, lh, sideRole);
      if (halfCand.utilizationPercent <= 96) {
        font = halfFont;
        density = halfCand;
      }
      break;
    }
    font = nextFont;
    lh = nextLh;
    density = cand;
  }

  const slack = Math.max(0, 96 - density.utilizationPercent);
  const sectionGapPx = clamp(Math.round(11 + slack * 0.75), 10, 28);
  const blockGapPx = clamp(Math.round(6 + slack * 0.4), 5, 14);
  const bulletGapPx = clamp(Math.round(4 + slack * 0.28), 3, 10);

  return {
    fontSizePt: font,
    lineHeight: lh,
    sectionGapPx,
    blockGapPx,
    bulletGapPx,
    estimatedUtilizationPercent: density.utilizationPercent,
  };
}

export function rebalanceCardLayout(card: FicheCard): FicheCard {
  let leftSections = [...card.leftSide.sections];
  let rightSections = [...card.rightSide.sections];
  let fontSizePt = card.fontSizePt;
  let lineHeight = card.lineHeight;

  if (rightSections.length === 0 && leftSections.length > 1) {
    const splitAt = Math.ceil(leftSections.length / 2);
    rightSections = leftSections.slice(splitAt);
    leftSections = leftSections.slice(0, splitAt);
  } else if (leftSections.length === 0 && rightSections.length > 1) {
    const splitAt = Math.floor(rightSections.length / 2);
    leftSections = rightSections.slice(0, splitAt);
    rightSections = rightSections.slice(splitAt);
  }

  for (let step = 0; step < 4; step += 1) {
    const leftD = estimateSideDensity({ sections: leftSections }, fontSizePt, lineHeight, 'recto');
    const rightD = estimateSideDensity({ sections: rightSections }, fontSizePt, lineHeight, 'verso');
    const currentPeak = Math.max(leftD.utilizationPercent, rightD.utilizationPercent);

    if (leftD.utilizationPercent > 95 && leftSections.length > 1) {
      const moved = leftSections[leftSections.length - 1];
      const nextLeft = leftSections.slice(0, -1);
      const nextRight = [moved, ...rightSections];
      const candL = estimateSideDensity({ sections: nextLeft }, fontSizePt, lineHeight, 'recto');
      const candR = estimateSideDensity({ sections: nextRight }, fontSizePt, lineHeight, 'verso');
      const candPeak = Math.max(candL.utilizationPercent, candR.utilizationPercent);
      if (candPeak < currentPeak && candR.utilizationPercent <= 99) {
        leftSections = nextLeft;
        rightSections = nextRight;
        continue;
      }
    }

    if (rightD.utilizationPercent > 95 && rightSections.length > 1) {
      const moved = rightSections[0];
      const nextRight = rightSections.slice(1);
      const nextLeft = [...leftSections, moved];
      const candL = estimateSideDensity({ sections: nextLeft }, fontSizePt, lineHeight, 'recto');
      const candR = estimateSideDensity({ sections: nextRight }, fontSizePt, lineHeight, 'verso');
      const candPeak = Math.max(candL.utilizationPercent, candR.utilizationPercent);
      if (candPeak < currentPeak && candL.utilizationPercent <= 99) {
        rightSections = nextRight;
        leftSections = nextLeft;
        continue;
      }
    }
    break;
  }

  // Gently scale font/lineHeight down if either side overflows (> 98%),
  // or step up (up to 10.4pt / 1.44) if both sides still have bottom space (< 88%).
  for (let step = 0; step < 8; step += 1) {
    const leftD = estimateSideDensity({ sections: leftSections }, fontSizePt, lineHeight, 'recto');
    const rightD = estimateSideDensity({ sections: rightSections }, fontSizePt, lineHeight, 'verso');
    if (leftD.utilizationPercent <= 98 && rightD.utilizationPercent <= 98) {
      break;
    }
    if (fontSizePt > 7.7) {
      fontSizePt = Number((fontSizePt - 0.2).toFixed(1));
    }
    if (lineHeight > 1.24) {
      lineHeight = Number((lineHeight - 0.02).toFixed(2));
    }
  }

  for (let step = 0; step < 8; step += 1) {
    const leftD = estimateSideDensity({ sections: leftSections }, fontSizePt, lineHeight, 'recto');
    const rightD = estimateSideDensity({ sections: rightSections }, fontSizePt, lineHeight, 'verso');
    if (leftD.utilizationPercent >= 88 || rightD.utilizationPercent >= 88) {
      break;
    }
    const nextFont = fontSizePt < 10.4 ? Number((fontSizePt + 0.2).toFixed(1)) : fontSizePt;
    const nextLh = lineHeight < 1.44 ? Number((lineHeight + 0.02).toFixed(2)) : lineHeight;
    const candL = estimateSideDensity({ sections: leftSections }, nextFont, nextLh, 'recto');
    const candR = estimateSideDensity({ sections: rightSections }, nextFont, nextLh, 'verso');
    if (candL.utilizationPercent > 96 || candR.utilizationPercent > 96) {
      break;
    }
    fontSizePt = nextFont;
    lineHeight = nextLh;
  }

  return {
    ...card,
    fontSizePt,
    lineHeight,
    autoFillHeight: card.autoFillHeight ?? true,
    leftSide: { sections: leftSections },
    rightSide: { sections: rightSections },
  };
}
