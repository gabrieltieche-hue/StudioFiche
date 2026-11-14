export type FicheVisualStyle = '2ndE' | '3eB';

export type SubjectKey =
  | 'SVT'
  | 'Physique-Chimie'
  | 'Français'
  | 'Histoire'
  | 'Géographie'
  | 'EMC'
  | 'Mathématiques'
  | 'Espagnol'
  | 'Anglais'
  | 'Autre';

export interface SubjectPalette {
  key: SubjectKey;
  label: string;
  headerDisplay: string;
  backgroundHex: string;
  gridLineHex: string;
  sectionBlueHex: string;
  accentRedHex: string;
}

export interface TextSpan {
  text: string;
  tone?: 'normal' | 'bold' | 'redBold' | 'underline' | 'italic';
}

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  x: number; // 0..100 normalized percentage coordinates
  y: number; // 0..100 normalized percentage coordinates
  width?: number; // percentage
  tone?: 'blue' | 'amber' | 'green' | 'red' | 'slate';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export type FicheBlock =
  | {
      id: string;
      type: 'paragraph';
      spans: TextSpan[];
    }
  | {
      id: string;
      type: 'bulletList';
      items: {
        id: string;
        level: 1 | 2;
        spans: TextSpan[];
      }[];
    }
  | {
      id: string;
      type: 'formulaBox';
      title?: string;
      formula: string;
      caption?: string;
    }
  | {
      id: string;
      type: 'table';
      headers: string[];
      rows: string[][];
    }
  | {
      id: string;
      type: 'vocabList';
      items: {
        id: string;
        term: string;
        definition: string;
      }[];
    }
  | {
      id: string;
      type: 'diagram';
      title: string;
      nodes: DiagramNode[];
      edges: DiagramEdge[];
      footnote?: string;
    };

export interface FicheSection {
  id: string;
  romanNumeral: string; // e.g., "I.", "II.", "3."
  title: string;
  isSubHeader?: boolean;
  blocks: FicheBlock[];
}

export interface FicheSide {
  sections: FicheSection[];
}

export interface FicheCard {
  id: string;
  index: number;
  className: string; // e.g. "2ndE"
  subject: SubjectKey;
  customSubjectLabel?: string;
  dateLabel: string; // e.g. "24/10"
  title: string;
  generatedPrompt?: string;
  backgroundHex: string;
  visualStyle: FicheVisualStyle;
  fontSizePt: number; // 8.0 to 11.5
  lineHeight: number; // 1.2 to 1.55
  leftSide: FicheSide; // Recto (14 x 19 cm)
  rightSide: FicheSide; // Verso (14 x 19 cm)
}

export interface SourceVerificationSummary {
  sourcesAnalyzed: string[];
  extractedSections: string[];
  notes?: string;
}

export interface FicheDeck {
  id: string;
  title: string;
  className: string;
  subject: SubjectKey;
  dateLabel: string;
  sourceFileNames: string[];
  metaPromptName: string;
  cards: FicheCard[];
  verification?: SourceVerificationSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PrintProfile {
  id: string;
  name: string;
  sheetWidthMm: number; // A4 landscape = 297
  sheetHeightMm: number; // A4 landscape = 210
  cardWidthMm: number; // 140 (14 cm)
  cardHeightMm: number; // 190 (19 cm)
  gutterMm: number; // Gap between Recto and Verso rectangles (e.g. 5 mm)
  showCutMarks: boolean;
  showSideLabels: boolean; // Subtle "RECTO" / "VERSO" outside cut area
  defaultVisualStyle: FicheVisualStyle;
}

export interface MetaPromptPreset {
  id: string;
  name: string;
  description: string;
  template: string;
  defaultCardCount: 'auto' | '1' | '2' | '3';
  updatedAt: string;
}
