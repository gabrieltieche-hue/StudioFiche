import type { FicheDeck } from '../types/fiche';

export const SAMPLE_DECKS: FicheDeck[] = [
  {
    id: 'sample-svt-chh',
    title: 'Contrôle et régulation hormonale de la fonction reproductrice mâle',
    className: '2ndE',
    subject: 'SVT',
    dateLabel: '24/10',
    sourceFileNames: ['Cours_SVT_Reproduction_2ndE.pdf'],
    metaPromptName: 'Méta-Prompt NotebookLM (Standard)',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-11-15T12:00:00.000Z',
    cards: [
      {
        id: 'card-svt-1',
        index: 1,
        className: '2ndE',
        subject: 'SVT',
        dateLabel: '24/10',
        title: 'Contrôle et régulation hormonale de la fonction reproductrice mâle',
        generatedPrompt:
          'Rédige une fiche de révision synthétique sur le contrôle et la régulation hormonale de la fonction reproductrice mâle : complexe hypothalamo-hypophysaire (GnRH), gonadostimulines (LH, FSH), cellules cibles et rétrocontrôle négatif.',
        backgroundHex: '#F3CBD5',
        visualStyle: '2ndE',
        fontSizePt: 9.2,
        lineHeight: 1.33,
        leftSide: {
          sections: [
            {
              id: 'svt-s1',
              romanNumeral: 'I.',
              title: 'Le complexe hypothalamo-hypophysaire (CHH) et la GnRH',
              blocks: [
                {
                  id: 'svt-b1',
                  type: 'paragraph',
                  spans: [
                    { text: 'Une commande cérébrale : ', tone: 'underline' },
                    { text: 'Le fonctionnement des testicules est sous le contrôle direct d’un ensemble d’organes situés à la base du cerveau : le ', tone: 'normal' },
                    { text: 'complexe hypothalamo-hypophysaire (CHH).', tone: 'redBold' },
                  ],
                },
                {
                  id: 'svt-b2',
                  type: 'paragraph',
                  spans: [
                    { text: 'L’hypothalamus et la GnRH : ', tone: 'underline' },
                    { text: 'Les neurones de l’hypothalamus sécrètent de façon pulsatile une neurohormone appelée la ', tone: 'normal' },
                    { text: 'GnRH', tone: 'redBold' },
                    { text: ' (Gonadotropin-Releasing Hormone).', tone: 'normal' },
                  ],
                },
                {
                  id: 'svt-b3',
                  type: 'paragraph',
                  spans: [
                    { text: 'La stimulation hypophysaire : ', tone: 'underline' },
                    { text: 'Libérée dans le sang, la GnRH gagne la glande hypophyse adjacente et stimule ses cellules spécialisées pour ', tone: 'normal' },
                    { text: 'déclencher la production de deux hormones.', tone: 'redBold' },
                  ],
                },
              ],
            },
            {
              id: 'svt-s2',
              romanNumeral: 'II.',
              title: 'Les gonadostimulines hypophysaires (LH et FSH) et leurs cibles',
              blocks: [
                {
                  id: 'svt-b4',
                  type: 'paragraph',
                  spans: [
                    { text: 'Action hormonale ciblée : ', tone: 'underline' },
                    { text: 'En réponse aux pulses de GnRH, l’hypophyse libère dans la circulation sanguine deux ', tone: 'normal' },
                    { text: 'gonadostimulines', tone: 'bold' },
                    { text: ' qui agissent spécifiquement sur deux types cellulaires du testicule :', tone: 'normal' },
                  ],
                },
                {
                  id: 'svt-b5',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'svt-i1',
                      level: 1,
                      spans: [
                        { text: 'La LH (Hormone Lutéinisante) → Cellules de Leydig :', tone: 'underline' },
                      ],
                    },
                    {
                      id: 'svt-i2',
                      level: 2,
                      spans: [
                        { text: 'Se fixe sur les récepteurs des cellules de ', tone: 'normal' },
                        { text: 'Leydig', tone: 'bold' },
                        { text: ' (situées dans le tissu interstitiel entre les tubes séminifères) et stimule la ', tone: 'normal' },
                        { text: 'sécrétion continue de testostérone', tone: 'redBold' },
                        { text: ' dans le sang.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'svt-i3',
                      level: 1,
                      spans: [
                        { text: 'La FSH (Hormone Folliculo-Stimulante) → Cellules de Sertoli :', tone: 'underline' },
                      ],
                    },
                    {
                      id: 'svt-i4',
                      level: 2,
                      spans: [
                        { text: 'Active ces cellules nourricières (paroi des tubes séminifères) qui, en synergie avec la testostérone, ', tone: 'normal' },
                        { text: 'entretiennent la spermatogenèse', tone: 'redBold' },
                        { text: ' (production quotidienne de millions de spermatozoïdes dès la puberté).', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'svt-s3',
              romanNumeral: '3.',
              title: 'Le mécanisme de rétrocontrôle négatif et homéostasie',
              isSubHeader: true,
              blocks: [
                {
                  id: 'svt-b6',
                  type: 'paragraph',
                  spans: [
                    { text: 'Stabilité des taux hormonaux : ', tone: 'underline' },
                    { text: 'Chez l’homme adulte, la testostéronémie (taux sanguin de testostérone) reste globalement constante malgré une sécrétion pulsatile. Ce maintien repose sur une boucle de régulation permanente.', tone: 'normal' },
                  ],
                },
                {
                  id: 'svt-b7',
                  type: 'paragraph',
                  spans: [
                    { text: 'Action inhibitrice en retour : ', tone: 'underline' },
                    { text: 'La testostérone circulante est détectée par des capteurs au niveau de l’hypothalamus et de l’hypophyse, sur lesquels elle exerce un ', tone: 'normal' },
                    { text: 'rétrocontrôle négatif permanent', tone: 'redBold' },
                    { text: ' (freinage des sécrétions de GnRH, LH et FSH).', tone: 'normal' },
                  ],
                },
              ],
            },
          ],
        },
        rightSide: {
          sections: [
            {
              id: 'svt-s4',
              romanNumeral: '3.',
              title: 'Le mécanisme de rétrocontrôle négatif (suite)',
              isSubHeader: true,
              blocks: [
                {
                  id: 'svt-b8',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'svt-i5',
                      level: 1,
                      spans: [{ text: 'Principe d’auto-régulation (boucle fermée) :', tone: 'bold' }],
                    },
                    {
                      id: 'svt-i6',
                      level: 2,
                      spans: [
                        { text: 'Si le taux sanguin de ', tone: 'normal' },
                        { text: 'testostérone augmente', tone: 'redBold' },
                        { text: ' au-dessus de la valeur de consigne, le rétrocontrôle négatif s’intensifie : ', tone: 'normal' },
                        { text: 'GnRH, LH et FSH diminuent', tone: 'redBold' },
                        { text: ', ce qui réduit la stimulation des cellules de Leydig et ramène la testostérone à son niveau normal.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'svt-i7',
                      level: 2,
                      spans: [
                        { text: 'Inversement, une ', tone: 'normal' },
                        { text: 'baisse de testostérone lève l’inhibition', tone: 'bold' },
                        { text: ' : la fréquence des pulses de GnRH puis la sécrétion de LH et FSH augmentent, relançant la synthèse testiculaire.', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'svt-s5',
              romanNumeral: '4.',
              title: 'Schéma-bilan fonctionnel (Chaîne de commande)',
              isSubHeader: true,
              blocks: [
                {
                  id: 'svt-b9',
                  type: 'diagram',
                  title: 'Régulation hormonale testiculaire',
                  nodes: [
                    { id: 'hypo', label: 'HYPOTHALAMUS', x: 50, y: 8, width: 42, tone: 'blue' },
                    { id: 'hypop', label: 'HYPOPHYSE', x: 50, y: 28, width: 38, tone: 'blue' },
                    { id: 'leydig', label: 'Cellules de Leydig', x: 30, y: 54, width: 32, tone: 'amber' },
                    { id: 'sertoli', label: 'Cellules de Sertoli', x: 70, y: 54, width: 32, tone: 'green' },
                    { id: 'testo', label: 'TESTOSTÉRONE', x: 30, y: 74, width: 30, tone: 'amber' },
                    { id: 'sperm', label: 'SPERMATOGENÈSE', sublabel: 'Spermatozoïdes', x: 70, y: 74, width: 32, tone: 'green' },
                    { id: 'retro', label: 'RÉTROCONTRÔLE NÉGATIF', sublabel: 'Maintien de l’équilibre hormonal', x: 50, y: 94, width: 48, tone: 'slate' },
                  ],
                  groups: [
                    {
                      id: 'grp-inter',
                      title: 'TISSU INTERSTITIEL',
                      subtitle: '(Cellules de Leydig)',
                      nodeIds: ['leydig', 'testo'],
                      tone: 'amber',
                    },
                    {
                      id: 'grp-tubes',
                      title: 'TUBES SÉMINIFÈRES',
                      subtitle: '(Cellules de Sertoli)',
                      nodeIds: ['sertoli', 'sperm'],
                      tone: 'green',
                    },
                  ],
                  edges: [
                    { from: 'hypo', to: 'hypop', label: 'GnRH' },
                    { from: 'hypop', to: 'leydig', label: 'LH' },
                    { from: 'hypop', to: 'sertoli', label: 'FSH' },
                    { from: 'leydig', to: 'testo' },
                    { from: 'sertoli', to: 'sperm' },
                    { from: 'testo', to: 'sperm' },
                    { from: 'testo', to: 'retro', dashed: true },
                    { from: 'retro', to: 'hypo', label: 'Inhibition (−)', dashed: true },
                  ],
                },
                {
                  id: 'svt-b10',
                  type: 'vocabList',
                  items: [
                    {
                      id: 'svt-v1',
                      term: 'Neurohormone',
                      definition: 'Messager chimique (ex : [rouge]GnRH[/rouge]) produit par des neurones et libéré dans le sang.',
                    },
                    {
                      id: 'svt-v2',
                      term: 'Rétrocontrôle négatif',
                      definition: '[rouge]Freinage exercé par la testostérone[/rouge] sur le complexe hypothalamo-hypophysaire pour stabiliser les taux.',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'sample-pc-optique',
    title: 'Propagation rectiligne, réflexion et réfraction de la lumière',
    className: '2ndE',
    subject: 'Physique-Chimie',
    dateLabel: '24/10',
    sourceFileNames: ['Chapitre_Optique_2ndE.pdf'],
    metaPromptName: 'Méta-Prompt NotebookLM (Standard)',
    createdAt: '2026-10-24T11:15:00.000Z',
    updatedAt: '2026-11-15T12:00:00.000Z',
    cards: [
      {
        id: 'card-pc-1',
        index: 1,
        className: '2ndE',
        subject: 'Physique-Chimie',
        dateLabel: '24/10',
        title: 'Propagation rectiligne, réflexion et réfraction de la lumière',
        backgroundHex: '#CBEAD4',
        visualStyle: '2ndE',
        fontSizePt: 9.2,
        lineHeight: 1.33,
        leftSide: {
          sections: [
            {
              id: 'pc-s1',
              romanNumeral: 'I.',
              title: 'Sources, spectres et propagation de la lumière',
              blocks: [
                {
                  id: 'pc-b1',
                  type: 'paragraph',
                  spans: [
                    { text: 'Modèle du rayon lumineux : ', tone: 'underline' },
                    { text: 'Dans un milieu transparent et homogène, ', tone: 'normal' },
                    { text: 'la lumière se propage toujours en ligne droite', tone: 'redBold' },
                    { text: '. On modélise son trajet par un rayon lumineux muni d’une flèche indiquant le sens de propagation.', tone: 'normal' },
                  ],
                },
                {
                  id: 'pc-b2',
                  type: 'paragraph',
                  spans: [
                    { text: 'Célérité et milieux matériels : ', tone: 'underline' },
                    { text: 'Dans le vide (et quasi à l’identique dans l’air), la lumière se déplace à une vitesse limite ', tone: 'normal' },
                    { text: 'c = 3,00 × 10⁸ m/s', tone: 'redBold' },
                    { text: ' (soit 300 000 km/s). Dans tout autre milieu transparent (eau, verre, plexiglas), sa vitesse v est strictement inférieure à c.', tone: 'normal' },
                  ],
                },
                {
                  id: 'pc-b2b',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'pc-i0a',
                      level: 1,
                      spans: [
                        { text: 'Spectre visible et longueur d’onde λ : ', tone: 'underline' },
                        { text: 'Une lumière monochromatique possède une seule longueur d’onde λ (laser). La ', tone: 'normal' },
                        { text: 'lumière visible correspond à λ compris entre 400 nm (violet) et 800 nm (rouge)', tone: 'redBold' },
                        { text: ' dans le vide.', tone: 'normal' },
                      ],
                    },
                  ],
                },
                {
                  id: 'pc-b3',
                  type: 'formulaBox',
                  title: 'Indice de réfraction n (grandeur sans unité)',
                  formula: 'n = c / v   (avec n ≥ 1,00)',
                  caption: 'Exemples usuels : air ≈ 1,00 | eau ≈ 1,33 | verre ≈ 1,50 | diamant ≈ 2,42.',
                },
              ],
            },
            {
              id: 'pc-s2',
              romanNumeral: 'II.',
              title: 'Réflexion et première loi de Snell-Descartes',
              blocks: [
                {
                  id: 'pc-b4',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'pc-i1',
                      level: 1,
                      spans: [
                        { text: 'Le dioptre : ', tone: 'underline' },
                        { text: 'Surface plane ou courbe séparant deux milieux transparents d’indices optiques différents (ex : surface air / eau).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'pc-i2',
                      level: 1,
                      spans: [
                        { text: 'La normale (N) et le plan d’incidence : ', tone: 'underline' },
                        { text: 'Droite perpendiculaire au dioptre passant par le point d’incidence I. Les angles se mesurent ', tone: 'normal' },
                        { text: 'toujours par rapport à la normale', tone: 'redBold' },
                        { text: ' (et jamais par rapport au dioptre).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'pc-i3',
                      level: 1,
                      spans: [
                        { text: 'Loi de la réflexion : ', tone: 'underline' },
                        { text: 'Le rayon réfléchi appartient au plan d’incidence et l’angle de réflexion i’ est égal à l’angle d’incidence i : ', tone: 'normal' },
                        { text: 'i’ = i (symétrie par rapport à la normale).', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'pc-i3b',
                      level: 1,
                      spans: [
                        { text: 'Partage du faisceau incident : ', tone: 'underline' },
                        { text: 'Au niveau d’un dioptre réel (vitre, surface d’eau), une partie de l’énergie lumineuse est réfléchie tandis que l’autre est réfractée.', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        rightSide: {
          sections: [
            {
              id: 'pc-s3',
              romanNumeral: 'III.',
              title: 'Réfraction, dispersion et cas particuliers',
              blocks: [
                {
                  id: 'pc-b5',
                  type: 'paragraph',
                  spans: [
                    { text: 'Phénomène de réfraction : ', tone: 'underline' },
                    { text: 'Lorsqu’un rayon lumineux traverse un dioptre, il subit un ', tone: 'normal' },
                    { text: 'changement de direction brusque appelé réfraction', tone: 'redBold' },
                    { text: ' dû au changement de vitesse de la lumière entre les deux milieux.', tone: 'normal' },
                  ],
                },
                {
                  id: 'pc-b6',
                  type: 'formulaBox',
                  title: '2ᵉ loi de Snell-Descartes (à maîtriser pour les calculs)',
                  formula: 'n₁ × sin(i₁) = n₂ × sin(i₂)',
                  caption: 'Exemple : air (n₁=1,00, i₁=45°) → verre (n₂=1,50) donne sin(i₂) = sin(45°)/1,50 ≈ 0,471 soit i₂ ≈ 28,1°.',
                },
                {
                  id: 'pc-b6b',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'pc-i4',
                      level: 1,
                      spans: [
                        { text: 'Dispersion par un prisme : ', tone: 'underline' },
                        { text: 'L’indice du verre variant légèrement selon la longueur d’onde λ, la ', tone: 'normal' },
                        { text: 'lumière blanche polychromatique est décomposée', tone: 'bold' },
                        { text: ' en spectre continu (violet 400 nm plus dévié que le rouge 800 nm).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'pc-i5',
                      level: 1,
                      spans: [
                        { text: 'Réflexion totale : ', tone: 'underline' },
                        { text: 'Si n₁ > n₂ et que l’angle d’incidence dépasse l’angle limite ', tone: 'normal' },
                        { text: 'sin(i_lim) = n₂ / n₁', tone: 'redBold' },
                        { text: ', il n’y a plus de rayon réfracté (principe de la fibre optique).', tone: 'normal' },
                      ],
                    },
                  ],
                },
                {
                  id: 'pc-b6c',
                  type: 'table',
                  headers: ['Cas physique', 'Condition sur n', 'Comportement du rayon'],
                  rows: [
                    ['Air → Eau / Verre', 'n₁ < n₂', 'Se rapproche de la normale (i₂ < i₁)'],
                    ['Verre → Air', 'n₁ > n₂', 'S’écarte de la normale (i₂ > i₁)'],
                    ['Incidence normale', 'i₁ = 0°', 'Pas de déviation (i₂ = 0°)'],
                  ],
                },
              ],
            },
            {
              id: 'pc-s4',
              romanNumeral: 'IV.',
              title: 'À retenir / Vocabulaire clé',
              blocks: [
                {
                  id: 'pc-b7',
                  type: 'vocabList',
                  items: [
                    { id: 'v1', term: 'Milieu dispersif', definition: 'Milieu dont l’indice de réfraction n dépend de la [rouge]longueur d’onde λ[/rouge] de la radiation.' },
                    { id: 'v2', term: 'Dioptre & Normale', definition: 'Surface entre deux milieux et sa [rouge]perpendiculaire au point d’incidence[/rouge] servant à repérer i₁ et i₂.' },
                    { id: 'v3', term: 'Lumière polychromatique', definition: 'Rayonnement composé de plusieurs longueurs d’onde, décomposable par [rouge]un prisme ou un réseau[/rouge].' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'sample-hist-rome',
    title: 'La République romaine et la naissance de l’Empire',
    className: '2ndE',
    subject: 'Histoire',
    dateLabel: '08/11',
    sourceFileNames: ['Histoire_Rome_2ndE.pdf', 'Manuel_Histoire_p42-49.pdf'],
    metaPromptName: 'Mode Contrôle Express (2 fiches max)',
    createdAt: '2026-11-08T15:00:00.000Z',
    updatedAt: '2026-11-15T12:00:00.000Z',
    cards: [
      {
        id: 'card-hist-1',
        index: 1,
        className: '2ndE',
        subject: 'Histoire',
        dateLabel: '08/11',
        title: 'La République romaine et la naissance de l’Empire',
        backgroundHex: '#F5E9A3',
        visualStyle: '2ndE',
        fontSizePt: 9.1,
        lineHeight: 1.32,
        leftSide: {
          sections: [
            {
              id: 'h-s1',
              romanNumeral: 'I.',
              title: 'L’organisation de la République romaine (509 av. J.-C. – Ier siècle av. J.-C.)',
              blocks: [
                {
                  id: 'h-b1',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'h-i1',
                      level: 1,
                      spans: [
                        { text: 'Origine du régime : ', tone: 'underline' },
                        { text: 'En ', tone: 'normal' },
                        { text: '509 av. J.-C.', tone: 'redBold' },
                        { text: ', les Romains chassent le roi étrusque Tarquin le Superbe et mettent fin à la monarchie pour ', tone: 'normal' },
                        { text: 'fonder la République', tone: 'bold' },
                        { text: ' (', tone: 'normal' },
                        { text: 'res publica', tone: 'italic' },
                        { text: ').', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i2',
                      level: 1,
                      spans: [
                        { text: 'Patriciens et Plébéiens : ', tone: 'underline' },
                        { text: 'À l’origine, seules les ', tone: 'normal' },
                        { text: 'familles riches et anciennes', tone: 'bold' },
                        { text: ' (patriciens) ', tone: 'normal' },
                        { text: 'détiennent le pouvoir.', tone: 'bold' },
                        { text: ' Le petit peuple (plébéiens) obtient ', tone: 'normal' },
                        { text: 'progressivement l’égalité des droits politiques', tone: 'redBold' },
                        { text: ' au fil des siècles.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i3',
                      level: 1,
                      spans: [
                        { text: 'Les Comices : ', tone: 'underline' },
                        { text: 'Assemblées', tone: 'bold' },
                        { text: ' de citoyens romains ', tone: 'normal' },
                        { text: 'qui votent les lois, décident de la paix et de la guerre', tone: 'redBold' },
                        { text: ', et élisent les magistrats.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i4',
                      level: 1,
                      spans: [
                        { text: 'Le Sénat : ', tone: 'underline' },
                        { text: 'Composé d’anciens magistrats, il occupe une place centrale en ', tone: 'normal' },
                        { text: 'gérant le trésor public, en dirigeant la politique extérieure', tone: 'redBold' },
                        { text: ' (envoi d’ambassadeurs) et en contrôlant l’action des magistrats.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i4b',
                      level: 1,
                      spans: [
                        { text: 'Les Consuls : ', tone: 'underline' },
                        { text: 'Au nombre de deux, élus pour un an, ils dirigent le gouvernement et détiennent le ', tone: 'normal' },
                        { text: 'commandement suprême des armées.', tone: 'bold' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'h-s2',
              romanNumeral: 'II.',
              title: 'Les conquêtes militaires et la crise de la République',
              blocks: [
                {
                  id: 'h-b2',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'h-i5',
                      level: 1,
                      spans: [
                        { text: 'Les Guerres puniques (264 – 146 av. J.-C.) : ', tone: 'underline' },
                        { text: 'Trois affrontements majeurs ', tone: 'normal' },
                        { text: 'opposent Rome à Carthage', tone: 'redBold' },
                        { text: ' pour la domination du bassin méditerranéen. ', tone: 'normal' },
                        { text: 'Scipion l’Africain l’emporte à Zama en 202 av. J.-C., et Carthage est détruite en 146 av. J.-C.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'h-i6',
                      level: 1,
                      spans: [
                        { text: 'La conquête de la Gaule (58 – 50 av. J.-C.) : ', tone: 'underline' },
                        { text: 'Jules César conquiert la Gaule et scelle sa ', tone: 'normal' },
                        { text: 'victoire décisive à Alésia en 52 av. J.-C.', tone: 'redBold' },
                        { text: ' face à la coalition menée par Vercingétorix, ouvrant la Gaule à la romanisation.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i7a',
                      level: 1,
                      spans: [
                        { text: 'La professionnalisation de l’armée et la crise : ', tone: 'underline' },
                        { text: 'Dès 107 av. J.-C. (réforme de Marius), les légionnaires deviennent des soldats professionnels équipés aux frais de leurs généraux (clientélisme militaire), ce qui ', tone: 'normal' },
                        { text: 'déclenche des guerres civiles sanglantes', tone: 'bold' },
                        { text: ' entre généraux ambitieux.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i7',
                      level: 1,
                      spans: [
                        { text: 'La dictature de César (-49 à -44) : ', tone: 'underline' },
                        { text: 'Après avoir franchi le Rubicon et vaincu Pompée, ', tone: 'normal' },
                        { text: 'César', tone: 'bold' },
                        { text: ' se fait nommer ', tone: 'normal' },
                        { text: 'dictateur à vie (imperator perpétuel).', tone: 'redBold' },
                        { text: ' Il est ', tone: 'normal' },
                        { text: 'assassiné aux Ides de Mars (-44)', tone: 'bold' },
                        { text: ' par des sénateurs républicains menés par Brutus et Cassius.', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        rightSide: {
          sections: [
            {
              id: 'h-s3',
              romanNumeral: 'III.',
              title: 'La naissance du Principat sous Octave Auguste (-27)',
              blocks: [
                {
                  id: 'h-b3',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'h-i8',
                      level: 1,
                      spans: [
                        { text: 'La bataille d’Actium (-31) : ', tone: 'underline' },
                        { text: 'Fils adoptif de César, ', tone: 'normal' },
                        { text: 'Octave remporte la guerre civile contre Marc Antoine et Cléopâtre lors de la bataille navale d’Actium (-31)', tone: 'redBold' },
                        { text: ', mettant fin aux guerres civiles et unifiant la Méditerranée sous son autorité.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i9',
                      level: 1,
                      spans: [
                        { text: 'L’instauration du Principat (-27) : ', tone: 'underline' },
                        { text: 'En 27 av. J.-C., Octave feint de rendre les pouvoirs au Sénat et fonde le Principatus (ou Empire) : il maintient en apparence les institutions républicaines (Sénat, consuls) tout en ', tone: 'normal' },
                        { text: 'concentrant l’autorité suprême à vie.', tone: 'bold' },
                      ],
                    },
                    {
                      id: 'h-i9a',
                      level: 1,
                      spans: [{ text: 'Le cumul des pouvoirs impériaux :', tone: 'underline' }],
                    },
                    {
                      id: 'h-i9b',
                      level: 2,
                      spans: [
                        { text: 'Pouvoir politique : ', tone: 'underline' },
                        { text: 'Premier des sénateurs (Princeps), il détient la puissance tribunitienne (droit de veto sur toute loi et inviolabilité).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i9c',
                      level: 2,
                      spans: [
                        { text: 'Pouvoir militaire : ', tone: 'underline' },
                        { text: 'Chef suprême des armées (Imperator), il commande directement les légions et administre les provinces impériales frontalières.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i9d',
                      level: 2,
                      spans: [
                        { text: 'Pouvoir religieux : ', tone: 'underline' },
                        { text: 'Élu Grand Pontife en 12 av. J.-C., il reçoit le titre sacré d’Auguste (« vénérable », protégé des dieux).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i9e',
                      level: 1,
                      spans: [
                        { text: 'Culte impérial et succession dynastique : ', tone: 'underline' },
                        { text: 'À sa mort en 14 ap. J.-C., Auguste reçoit ', tone: 'normal' },
                        { text: 'l’apothéose (divinisation par le Sénat)', tone: 'redBold' },
                        { text: ' et son fils adoptif Tibère lui succède, fondant la dynastie julio-claudienne.', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'h-s4',
              romanNumeral: 'IV.',
              title: 'Pax Romana, romanisation et vocabulaire clé',
              blocks: [
                {
                  id: 'h-b4',
                  type: 'vocabList',
                  items: [
                    { id: 'hv1', term: 'République (res publica)', definition: 'Régime politique sans roi où le [rouge]pouvoir appartient au peuple[/rouge] à travers magistrats et assemblées.' },
                    { id: 'hv1b', term: 'Pax Romana (Ier–IIe s.)', definition: '[rouge]Période de paix et de prospérité[/rouge] protégée par les légions aux frontières fortifiées (limes).' },
                    { id: 'hv2', term: 'Principatus (ou Empire)', definition: 'Régime instauré par Auguste maintenant les formes républicaines mais remettant la [rouge]totalité du pouvoir à l’empereur[/rouge].' },
                    { id: 'hv3', term: 'Romanisation & Édit de Caracalla (212)', definition: 'Diffusion du mode de vie romain (thermes, forums, aqueducs, ex : Nîmes, Timgad), couronnée par [rouge]l’accès de tous les hommes libres à la citoyenneté[/rouge].' },
                    { id: 'hv4', term: 'Imperator & Auguste', definition: 'Titres désignant le [rouge]chef suprême des armées[/rouge] et le souverain sacré vénéré par le culte impérial.' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
];
