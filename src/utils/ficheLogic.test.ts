import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompiledMetaPrompt,
  computeAutoSideTypography,
  computeSheetGeometry,
  DEFAULT_META_PROMPT_TEMPLATE,
  DEFAULT_PRINT_PROFILE,
  estimateSideDensity,
  markupToSpans,
  normalizeRomanNumeral,
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
  assert.equal(deck.cards[0].backgroundHex, '#F5E9A3');
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

test('normalizeRomanNumeral appends trailing dot when missing and preserves punctuation', () => {
  assert.equal(normalizeRomanNumeral('I'), 'I.');
  assert.equal(normalizeRomanNumeral('II.'), 'II.');
  assert.equal(normalizeRomanNumeral('III'), 'III.');
  assert.equal(normalizeRomanNumeral('3'), '3.');
  assert.equal(normalizeRomanNumeral('IV)'), 'IV)');
});

test('sanitizeDiagramData preserves and validates groups referencing node IDs', () => {
  const result = sanitizeDiagramData({
    title: 'Régulation',
    nodes: [
      { id: 'n1', label: 'Leydig', x: 30, y: 50 },
      { id: 'n2', label: 'Testostérone', x: 30, y: 70 },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
    groups: [
      { id: 'g1', title: 'TISSU INTERSTITIEL', nodeIds: ['n1', 'n2', 'unknown'], tone: 'jaune' },
    ],
  });

  assert.ok(result.groups);
  assert.equal(result.groups?.length, 1);
  assert.deepEqual(result.groups?.[0].nodeIds, ['n1', 'n2']);
  assert.equal(result.groups?.[0].tone, 'amber');
});

test('rebalanceCardLayout resolves Recto overflow by moving a section when Verso can absorb it', () => {
  const longPara = {
    id: 'p',
    type: 'paragraph' as const,
    spans: [{ text: 'Analyse historique détaillée des événements majeurs de la période étudiée en classe. '.repeat(3), tone: 'normal' as const }],
  };
  const balanced = rebalanceCardLayout({
    id: 'c2',
    index: 1,
    className: '2ndE',
    subject: 'Histoire',
    dateLabel: '15/11',
    title: 'Rome antique',
    backgroundHex: '#F5E9A3',
    visualStyle: '2ndE',
    fontSizePt: 9.0,
    lineHeight: 1.34,
    leftSide: {
      sections: [
        { id: 's1', romanNumeral: 'I.', title: 'République', blocks: [longPara, longPara, longPara] },
        { id: 's2', romanNumeral: 'II.', title: 'Empire', blocks: [longPara] },
      ],
    },
    rightSide: {
      sections: [
        { id: 's3', romanNumeral: 'III.', title: 'Christianisation', blocks: [longPara, longPara] },
      ],
    },
  });

  const leftAfter = estimateSideDensity(balanced.leftSide, balanced.fontSizePt, balanced.lineHeight, 'recto');
  const rightAfter = estimateSideDensity(balanced.rightSide, balanced.fontSizePt, balanced.lineHeight, 'verso');
  assert.equal(leftAfter.isOverflowRisk, false, `Expected left overflow resolved, got ${leftAfter.utilizationPercent}%`);
  assert.equal(rightAfter.isOverflowRisk, false, `Expected right overflow resolved, got ${rightAfter.utilizationPercent}%`);
});

test('markupToSpans parses nested *italic* inside __underline__ and **bold** without literal asterisks', () => {
  const input = '__Rousseau, *Les Confessions* (1782) :__ 1re autobiographie moderne.';
  const spans = markupToSpans(input);
  assert.deepEqual(spans, [
    { text: 'Rousseau, ', tone: 'underline' },
    { text: 'Les Confessions', tone: 'underline', italic: true },
    { text: ' (1782) :', tone: 'underline' },
    { text: ' 1re autobiographie moderne.', tone: 'normal' },
  ]);
  assert.equal(spans.some((s) => s.text.includes('*')), false);
  assert.deepEqual(markupToSpans(spansToMarkup(spans)), spans);

  const boldNested = markupToSpans('**R. Gary, *La Promesse de l’aube* (1960)**');
  assert.deepEqual(boldNested, [
    { text: 'R. Gary, ', tone: 'bold' },
    { text: 'La Promesse de l’aube', tone: 'bold', italic: true },
    { text: ' (1960)', tone: 'bold' },
  ]);
});

test('computeAutoSideTypography boosts sparse side font & spacing toward full-page target without overflow', () => {
  const sparseSide = {
    sections: [
      {
        id: 's1',
        romanNumeral: 'I.',
        title: 'Définir le genre autobiographique (Séances 1 & 2)',
        blocks: [
          {
            id: 'p1',
            type: 'paragraph' as const,
            spans: [
              {
                text: 'Étymologie & Pacte : auto (soi-même) + bio (vie) + graphie (écriture) = récit rétrospectif en prose où auteur = narrateur = personnage principal. Par le pacte autobiographique, l’auteur s’engage à dire la vérité et à être sincère.',
                tone: 'normal' as const,
              },
            ],
          },
          {
            id: 'b1',
            type: 'bulletList' as const,
            items: [
              {
                id: 'i1',
                level: 1 as const,
                spans: [
                  {
                    text: 'Rousseau, Les Confessions (1782) : 1re autobiographie moderne ; anaphore du « je » et affirmation de sa singularité (« je ne suis fait comme aucun... »). Fonctions voisines : témoigner d’un trauma (P. Levi) ou retracer sa construction.',
                    tone: 'normal' as const,
                  },
                ],
              },
              {
                id: 'i2',
                level: 1 as const,
                spans: [
                  {
                    text: 'N. Sarraute, Enfance (1983) : incipit en dialogue à deux voix avec son alter ego ; hésitations (présent, « peut-être », négations, points de suspension) par peur de figer ses 11 premières années.',
                    tone: 'normal' as const,
                  },
                ],
              },
              {
                id: 'i3',
                level: 1 as const,
                spans: [
                  {
                    text: 'R. Dahl, Moi, Boy (1984) : refuse l’autobiographie formelle aux « détails fastidieux » ; il trie ses souvenirs mémorables (drôles, douloureux, déplaisants) repris par des pronoms indéfinis.',
                    tone: 'normal' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 's2',
        romanNumeral: 'II.',
        title: 'Se représenter et faire revivre le souvenir (Séances 3 & 4)',
        blocks: [
          {
            id: 'b2',
            type: 'bulletList' as const,
            items: [
              {
                id: 'i4',
                level: 1 as const,
                spans: [
                  {
                    text: 'L’autoportrait (arts & lettres) : représentation non chronologique centrée sur le moi, les émotions et les symboles (pose, cadrage, couleurs) :',
                    tone: 'normal' as const,
                  },
                ],
              },
              {
                id: 'i5',
                level: 2 as const,
                spans: [
                  {
                    text: 'Frida Kahlo (Autoportrait aux cheveux défaits, 1947) : peinte au miroir à 37 ans ; plante grasse (vie), roche volcanique (mort), robe Tahuana (patrimoine mexicain), visage au naturel.',
                    tone: 'normal' as const,
                  },
                ],
              },
              {
                id: 'i6',
                level: 2 as const,
                spans: [
                  {
                    text: 'Norman Rockwell (Triple autoportrait, 1960) : mise en abyme (se peint en train de peindre), pinceaux et cartes d’anciens maîtres (Dürer, Rembrandt, Picasso, Van Gogh).',
                    tone: 'normal' as const,
                  },
                ],
              },
              {
                id: 'i7',
                level: 1 as const,
                spans: [
                  {
                    text: 'R. Gary, La Promesse de l’aube (1960) : alternance entre 2 époques verbales (temps du passé pour ses 13 ans / présent d’énonciation pour le regard adulte) et lien fusionnel avec sa mère.',
                    tone: 'normal' as const,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const baseDensity = estimateSideDensity(sparseSide, 9.0, 1.34, 'recto');
  const auto = computeAutoSideTypography(sparseSide, 9.0, 1.34, 'recto');

  assert.ok(baseDensity.utilizationPercent >= 65 && baseDensity.utilizationPercent <= 82, `Expected sparse base ~65-82%, got ${baseDensity.utilizationPercent}%`);
  assert.ok(auto.fontSizePt > 9.8, `Expected boosted fontSizePt > 9.8, got ${auto.fontSizePt}`);
  assert.ok(auto.lineHeight > 1.38, `Expected boosted lineHeight > 1.38, got ${auto.lineHeight}`);
  assert.ok(
    auto.estimatedUtilizationPercent >= 88 && auto.estimatedUtilizationPercent <= 98,
    `Expected auto utilization between 88% and 98%, got ${auto.estimatedUtilizationPercent}%`
  );
});

test('computeAutoSideTypography keeps comfortable lineHeight >= 1.32 and spacing even on dense sides', () => {
  const denseSide = {
    sections: [
      {
        id: 's1',
        romanNumeral: 'I.',
        title: 'Synthèse dense',
        blocks: [
          {
            id: 'b1',
            type: 'bulletList' as const,
            items: Array.from({ length: 12 }, (_, idx) => ({
              id: `item-${idx}`,
              level: 1 as const,
              spans: [
                {
                  text: `Notion clé n°${idx + 1} : explication synthétique précise avec un exemple concret et une référence littéraire ou historique importante.`,
                  tone: 'normal' as const,
                },
              ],
            })),
          },
        ],
      },
    ],
  };

  const auto = computeAutoSideTypography(denseSide, 9.2, 1.38, 'recto');
  assert.ok(auto.lineHeight >= 1.32, `Expected lineHeight >= 1.32, got ${auto.lineHeight}`);
  assert.ok(auto.bulletGapPx >= 5, `Expected bulletGapPx >= 5, got ${auto.bulletGapPx}`);
  assert.ok(auto.blockGapPx >= 6, `Expected blockGapPx >= 6, got ${auto.blockGapPx}`);
});

