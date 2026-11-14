import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompiledMetaPrompt,
  computeSheetGeometry,
  DEFAULT_META_PROMPT_TEMPLATE,
  DEFAULT_PRINT_PROFILE,
  estimateSideDensity,
  markupToSpans,
  parseDeckFromJsonInput,
  rebalanceCardLayout,
  sanitizeDiagramData,
  spansToMarkup,
} from './ficheLogic';

test('computeSheetGeometry centers two 14x19 cm cards on A4 landscape (29.7x21 cm)', () => {
  const geom = computeSheetGeometry(DEFAULT_PRINT_PROFILE);
  assert.equal(geom.fitsOnSheet, true);
  assert.equal(geom.totalContentWidthMm, 285);
  assert.equal(geom.marginLeftMm, 6);
  assert.equal(geom.marginRightMm, 6);
  assert.equal(geom.marginTopMm, 10);
  assert.equal(geom.marginBottomMm, 10);
  assert.equal(geom.leftCardXMm, 6);
  assert.equal(geom.rightCardXMm, 151);
});

test('computeSheetGeometry detects overflow when card dimensions exceed sheet size', () => {
  const geom = computeSheetGeometry({
    ...DEFAULT_PRINT_PROFILE,
    cardWidthMm: 160,
    gutterMm: 10,
  });
  assert.equal(geom.fitsOnSheet, false);
});

test('buildCompiledMetaPrompt substitutes placeholders and enforces card count', () => {
  const prompt = buildCompiledMetaPrompt({
    template: DEFAULT_META_PROMPT_TEMPLATE,
    className: '2ndE',
    subject: 'Histoire',
    topic: 'La République romaine',
    cardCount: '2',
    extraInstructions: 'Mettre les dates en rouge',
  });

  assert.ok(prompt.includes('2ndE'));
  assert.ok(prompt.includes('Histoire'));
  assert.ok(prompt.includes('La République romaine'));
  assert.ok(prompt.includes('exactement 2 fiche(s)'));
  assert.ok(prompt.includes('Mettre les dates en rouge'));
});

test('estimateSideDensity calculates reasonable utilization without overflow for concise side', () => {
  const density = estimateSideDensity(
    {
      sections: [
        {
          id: 's1',
          romanNumeral: 'I.',
          title: 'Introduction',
          blocks: [
            {
              id: 'b1',
              type: 'paragraph',
              spans: [{ text: 'Un paragraphe court pour tester la densité.', tone: 'normal' }],
            },
          ],
        },
      ],
    },
    9.0,
    1.32
  );
  assert.equal(density.isOverflowRisk, false);
  assert.ok(density.utilizationPercent > 0 && density.utilizationPercent < 40);
});

test('parseDeckFromJsonInput parses fenced JSON and normalizes subject palette', () => {
  const json = `\`\`\`json
  {
    "title": "La République romaine",
    "className": "2ndE",
    "subject": "Histoire",
    "dateLabel": "08/11",
    "cards": [
      {
        "title": "La République romaine",
        "leftSide": { "sections": [] },
        "rightSide": { "sections": [] }
      }
    ]
  }
  \`\`\``;

  const deck = parseDeckFromJsonInput(json);
  assert.equal(deck.title, 'La République romaine');
  assert.equal(deck.cards.length, 1);
  assert.equal(deck.cards[0].backgroundHex, '#F5EAAD');
  assert.equal(deck.cards[0].visualStyle, '2ndE');
});

test('parseDeckFromJsonInput assigns missing IDs and supports recto/verso/bullets aliases', () => {
  const json = JSON.stringify({
    title: 'Poésie',
    subject: 'Français',
    classLabel: '2ndE',
    cards: [
      {
        title: 'La poésie lyrique',
        recto: {
          sections: [
            {
              title: 'Définition',
              blocks: [{ type: 'paragraph', spans: [{ text: 'Lyrisme.' }] }],
            },
          ],
        },
        verso: {
          sections: [
            {
              title: 'À retenir',
              blocks: [{ type: 'bullets', items: [{ spans: [{ text: 'Point clé' }] }] }],
            },
          ],
        },
      },
    ],
  });

  const deck = parseDeckFromJsonInput(json);
  assert.equal(deck.cards[0].className, '2ndE');
  assert.ok(deck.cards[0].leftSide.sections[0].id);
  assert.ok(deck.cards[0].leftSide.sections[0].blocks[0].id);
  const versoBlock = deck.cards[0].rightSide.sections[0].blocks[0];
  assert.equal(versoBlock.type, 'bulletList');
  if (versoBlock.type === 'bulletList') {
    assert.ok(versoBlock.items[0].id);
  }
});

test('markupToSpans parses redBold, bold, underline, italic, and nested [rouge] markers', () => {
  const input = '__Principe :__ La [rouge]République romaine[/rouge] naît en **-509** (*Tite-Live*).';
  const spans = markupToSpans(input);
  assert.equal(spans[0].tone, 'underline');
  assert.equal(spans[0].text, 'Principe :');
  assert.equal(spans[2].tone, 'redBold');
  assert.equal(spans[2].text, 'République romaine');
  assert.equal(spans[4].tone, 'bold');
  assert.equal(spans[4].text, '-509');
  assert.equal(spans[6].tone, 'italic');
  assert.equal(spans[6].text, 'Tite-Live');
  assert.equal(spansToMarkup(spans), input);

  const nested = markupToSpans('__Guerres puniques ([rouge]-264 à -146[/rouge]) :__');
  assert.deepEqual(nested, [
    { text: 'Guerres puniques (', tone: 'underline' },
    { text: '-264 à -146', tone: 'redBold' },
    { text: ') :', tone: 'underline' },
  ]);
});

test('sanitizeDiagramData normalizes 0..1 coordinates, unknown tones, overlaps, and label edges', () => {
  const result = sanitizeDiagramData({
    title: 'Institutions de la République',
    nodes: [
      { id: 'comices', label: 'Comices', x: 0.5, y: 0.2, tone: 'jaune' },
      { id: 'senat', label: 'Sénat', x: 0.5, y: 0.22, tone: 'violet' },
    ],
    edges: [
      { from: 'Comices', to: 'senat', label: 'élisent' },
      { from: 'missing', to: 'senat' },
    ],
  });

  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0].x, 50);
  assert.equal(result.nodes[0].tone, 'amber');
  assert.equal(result.nodes[1].tone, 'blue');
  assert.ok(Math.abs(result.nodes[1].y - result.nodes[0].y) >= 16);
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].from, 'comices');
  assert.equal(result.edges[0].to, 'senat');
});

test('rebalanceCardLayout splits single-sided sections cleanly across Recto and Verso', () => {
  const balanced = rebalanceCardLayout({
    id: 'c1',
    index: 1,
    className: '2ndE',
    subject: 'Histoire',
    dateLabel: '14/11',
    title: 'Rome',
    backgroundHex: '#F5EAAD',
    visualStyle: '2ndE',
    fontSizePt: 9.0,
    lineHeight: 1.32,
    leftSide: {
      sections: [
        { id: 's1', romanNumeral: 'I.', title: 'A', blocks: [] },
        { id: 's2', romanNumeral: 'II.', title: 'B', blocks: [] },
      ],
    },
    rightSide: { sections: [] },
  });

  assert.equal(balanced.leftSide.sections.length, 1);
  assert.equal(balanced.rightSide.sections.length, 1);
});
