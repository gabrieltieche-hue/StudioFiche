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
    updatedAt: '2026-10-24T10:00:00.000Z',
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
        backgroundHex: '#F4CED6',
        visualStyle: '2ndE',
        fontSizePt: 8.8,
        lineHeight: 1.3,
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
                    { text: 'L’hypophyse libère dans la circulation générale deux gonadostimulines qui agissent spécifiquement sur le testicule :', tone: 'normal' },
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
                        { text: 'La LH ', tone: 'underline' },
                        { text: '(Hormone Lutéinisante) → Cellules de ', tone: 'normal' },
                        { text: 'Leydig', tone: 'redBold' },
                        { text: ' :', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'svt-i2',
                      level: 2,
                      spans: [
                        { text: 'Se fixe sur les cellules de Leydig (tissu interstitiel) et stimule la ', tone: 'normal' },
                        { text: 'sécrétion de testostérone.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'svt-i3',
                      level: 1,
                      spans: [
                        { text: 'La FSH ', tone: 'underline' },
                        { text: '(Hormone Folliculo-Stimulante) → Cellules de ', tone: 'normal' },
                        { text: 'Sertoli', tone: 'redBold' },
                        { text: ' :', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'svt-i4',
                      level: 2,
                      spans: [
                        { text: 'Active ces cellules nourricières qui, avec la testostérone, ', tone: 'normal' },
                        { text: 'entretiennent la spermatogenèse', tone: 'redBold' },
                        { text: ' (production des spermatozoïdes).', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'svt-s3',
              romanNumeral: '3.',
              title: 'Le mécanisme de rétrocontrôle négatif',
              isSubHeader: true,
              blocks: [
                {
                  id: 'svt-b6',
                  type: 'paragraph',
                  spans: [
                    { text: 'Stabilité des taux hormonaux : ', tone: 'underline' },
                    { text: 'Chez l’homme adulte, la production de testostérone et de spermatozoïdes est continue et maintenue à un niveau constant.', tone: 'normal' },
                  ],
                },
                {
                  id: 'svt-b7',
                  type: 'paragraph',
                  spans: [
                    { text: 'Le rétrocontrôle par la testostérone : ', tone: 'underline' },
                    { text: 'La testostérone libérée exerce en retour une inhibition (', tone: 'normal' },
                    { text: 'rétrocontrôle négatif', tone: 'redBold' },
                    { text: ') sur le complexe hypothalamo-hypophysaire.', tone: 'normal' },
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
                      spans: [{ text: 'Principe d’auto-régulation :', tone: 'bold' }],
                    },
                    {
                      id: 'svt-i6',
                      level: 2,
                      spans: [
                        { text: 'Si le taux sanguin de ', tone: 'normal' },
                        { text: 'testostérone augmente', tone: 'redBold' },
                        { text: ', le rétrocontrôle négatif s’intensifie : ', tone: 'normal' },
                        { text: 'GnRH, LH et FSH diminuent', tone: 'redBold' },
                        { text: ', ramenant la testostérone à sa valeur normale.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'svt-i7',
                      level: 2,
                      spans: [
                        { text: 'Inversement, une baisse de testostérone lève l’inhibition, stimulant GnRH et gonadostimulines.', tone: 'normal' },
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
                    { id: 'hypo', label: 'HYPOTHALAMUS', x: 54, y: 8, width: 42, tone: 'blue' },
                    { id: 'hypop', label: 'HYPOPHYSE', x: 54, y: 31, width: 40, tone: 'blue' },
                    { id: 'leydig', label: 'TISSU INTERSTITIEL', sublabel: 'Cellules de Leydig', x: 35, y: 55, width: 34, tone: 'amber' },
                    { id: 'sertoli', label: 'TUBES SÉMINIFÈRES', sublabel: 'Cellules de Sertoli', x: 75, y: 55, width: 34, tone: 'green' },
                    { id: 'testo', label: 'TESTOSTÉRONE', x: 35, y: 76, width: 32, tone: 'amber' },
                    { id: 'sperm', label: 'SPERMATOGENÈSE', sublabel: 'Spermatozoïdes', x: 75, y: 76, width: 34, tone: 'green' },
                    { id: 'retro', label: 'RÉTROCONTRÔLE NÉGATIF', sublabel: 'Maintien de l’équilibre hormonal', x: 54, y: 95, width: 52, tone: 'slate' },
                  ],
                  edges: [
                    { from: 'hypo', to: 'hypop', label: 'GnRH' },
                    { from: 'hypop', to: 'leydig', label: 'LH' },
                    { from: 'hypop', to: 'sertoli', label: 'FSH' },
                    { from: 'leydig', to: 'testo' },
                    { from: 'sertoli', to: 'sperm' },
                    { from: 'testo', to: 'retro', dashed: true },
                    { from: 'retro', to: 'hypo', label: 'Inhibition (−)', dashed: true },
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
    updatedAt: '2026-10-24T11:15:00.000Z',
    cards: [
      {
        id: 'card-pc-1',
        index: 1,
        className: '2ndE',
        subject: 'Physique-Chimie',
        dateLabel: '24/10',
        title: 'Propagation rectiligne, réflexion et réfraction de la lumière',
        backgroundHex: '#CFEBD7',
        visualStyle: '2ndE',
        fontSizePt: 8.8,
        lineHeight: 1.3,
        leftSide: {
          sections: [
            {
              id: 'pc-s1',
              romanNumeral: 'I.',
              title: 'Propagation et vitesse de la lumière',
              blocks: [
                {
                  id: 'pc-b1',
                  type: 'paragraph',
                  spans: [
                    { text: 'Propagation rectiligne : ', tone: 'bold' },
                    { text: 'Dans un milieu transparent et homogène, ', tone: 'redBold' },
                    { text: 'la lumière se propage toujours en ligne droite.', tone: 'redBold' },
                  ],
                },
                {
                  id: 'pc-b2',
                  type: 'paragraph',
                  spans: [
                    { text: 'Vitesse de la lumière : ', tone: 'bold' },
                    { text: 'Dans le vide et dans l’air, la lumière se déplace à une vitesse limite ', tone: 'normal' },
                    { text: 'c = 3,00 × 10⁸ m/s', tone: 'redBold' },
                    { text: '. Dans tout autre milieu transparent, v < c.', tone: 'normal' },
                  ],
                },
                {
                  id: 'pc-b3',
                  type: 'formulaBox',
                  title: 'Indice de réfraction n (sans unité)',
                  formula: 'n = c / v',
                  caption: 'Toujours supérieur ou égal à 1 (pour l’air et le vide, n = 1,00).',
                },
              ],
            },
            {
              id: 'pc-s2',
              romanNumeral: 'II.',
              title: 'Réflexion et lois de Snell-Descartes',
              blocks: [
                {
                  id: 'pc-b4',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'pc-i1',
                      level: 1,
                      spans: [
                        { text: 'Dioptre : ', tone: 'bold' },
                        { text: 'Surface séparant deux milieux transparents d’indices différents.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'pc-i2',
                      level: 1,
                      spans: [
                        { text: 'Normale : ', tone: 'bold' },
                        { text: 'Droite perpendiculaire au dioptre au point d’impact (référence pour les angles).', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'pc-i3',
                      level: 1,
                      spans: [
                        { text: 'Réflexion : ', tone: 'underline' },
                        { text: 'L’angle de réflexion i’ est égal à l’angle d’incidence i : ', tone: 'normal' },
                        { text: 'i = i’', tone: 'redBold' },
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
              title: 'Réfraction et loi de Snell-Descartes',
              blocks: [
                {
                  id: 'pc-b5',
                  type: 'paragraph',
                  spans: [
                    { text: 'Phénomène de réfraction : ', tone: 'underline' },
                    { text: 'Changement de direction d’un rayon lumineux lorsqu’il traverse la surface séparant deux milieux transparents d’indices optiques différents.', tone: 'normal' },
                  ],
                },
                {
                  id: 'pc-b6',
                  type: 'formulaBox',
                  title: '2ᵉ loi de Snell-Descartes pour la réfraction',
                  formula: 'n₁ × sin(i) = n₂ × sin(r)',
                  caption: 'Le rayon réfracté appartient au plan d’incidence.',
                },
              ],
            },
            {
              id: 'pc-s4',
              romanNumeral: 'IV.',
              title: 'À retenir / Vocabulaire',
              blocks: [
                {
                  id: 'pc-b7',
                  type: 'vocabList',
                  items: [
                    { id: 'v1', term: 'Dioptre', definition: 'Surface séparant deux milieux transparents.' },
                    { id: 'v2', term: 'Normale', definition: 'Droite perpendiculaire au dioptre au point d’incidence.' },
                    { id: 'v3', term: 'Angle d’incidence (i)', definition: 'Angle entre le rayon incident et la normale.' },
                    { id: 'v4', term: 'Angle de réfraction (r)', definition: 'Angle entre le rayon réfracté et la normale.' },
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
    updatedAt: '2026-11-08T15:00:00.000Z',
    cards: [
      {
        id: 'card-hist-1',
        index: 1,
        className: '2ndE',
        subject: 'Histoire',
        dateLabel: '08/11',
        title: 'La République romaine et la naissance de l’Empire',
        backgroundHex: '#F5EAAD',
        visualStyle: '2ndE',
        fontSizePt: 8.8,
        lineHeight: 1.3,
        leftSide: {
          sections: [
            {
              id: 'h-s1',
              romanNumeral: 'I.',
              title: 'L’organisation de la République romaine (509 av. J.-C. – Ier s. av. J.-C.)',
              blocks: [
                {
                  id: 'h-b1',
                  type: 'bulletList',
                  items: [
                    {
                      id: 'h-i1',
                      level: 1,
                      spans: [
                        { text: 'Origine du régime : ', tone: 'bold' },
                        { text: 'En ', tone: 'normal' },
                        { text: '509 av. J.-C.', tone: 'redBold' },
                        { text: ', les Romains chassent le roi étrusque Tarquin le Superbe et fondent la République (', tone: 'normal' },
                        { text: 'res publica', tone: 'italic' },
                        { text: ').', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i2',
                      level: 1,
                      spans: [
                        { text: 'Patriciens et Plébéiens : ', tone: 'bold' },
                        { text: 'Les familles riches (patriciens) détiennent d’abord le pouvoir ; les plébéiens obtiennent ', tone: 'normal' },
                        { text: 'l’égalité des droits politiques.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'h-i3',
                      level: 1,
                      spans: [
                        { text: 'Le Sénat : ', tone: 'bold' },
                        { text: 'Composé d’anciens magistrats, il gère le ', tone: 'normal' },
                        { text: 'trésor public et la politique extérieure.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'h-i4',
                      level: 1,
                      spans: [
                        { text: 'Les Consuls : ', tone: 'bold' },
                        { text: 'Élus pour 1 an (au nombre de deux), ils dirigent le gouvernement et commandent les armées.', tone: 'normal' },
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
                        { text: 'Guerres puniques (264 – 146 av. J.-C.) : ', tone: 'bold' },
                        { text: 'Affrontement contre Carthage ; ', tone: 'normal' },
                        { text: 'Carthage est détruite en 146 av. J.-C.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'h-i6',
                      level: 1,
                      spans: [
                        { text: 'Conquête de la Gaule (58 – 50 av. J.-C.) : ', tone: 'bold' },
                        { text: 'Victoire de Jules César à ', tone: 'normal' },
                        { text: 'Alésia en 52 av. J.-C.', tone: 'redBold' },
                        { text: ' contre Vercingétorix.', tone: 'normal' },
                      ],
                    },
                    {
                      id: 'h-i7',
                      level: 1,
                      spans: [
                        { text: 'Dictature de César (-49 à -44) : ', tone: 'bold' },
                        { text: 'Nommé ', tone: 'normal' },
                        { text: 'dictateur à vie', tone: 'redBold' },
                        { text: ', assassiné aux Ides de Mars (-44).', tone: 'normal' },
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
                        { text: 'Bataille d’Actium (-31) : ', tone: 'bold' },
                        { text: 'Octave bat Marc Antoine et Cléopâtre.', tone: 'redBold' },
                      ],
                    },
                    {
                      id: 'h-i9',
                      level: 1,
                      spans: [
                        { text: 'Instauration du Principat (-27) : ', tone: 'bold' },
                        { text: 'Octave conserve les apparences républicaines tout en concentrant tous les pouvoirs (', tone: 'normal' },
                        { text: 'Princeps, Imperator, Grand Pontife', tone: 'redBold' },
                        { text: ').', tone: 'normal' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'h-s4',
              romanNumeral: 'IV.',
              title: 'Les notions et vocabulaire clés à retenir',
              blocks: [
                {
                  id: 'h-b4',
                  type: 'vocabList',
                  items: [
                    { id: 'hv1', term: 'République (res publica)', definition: 'Régime politique sans roi où le pouvoir appartient au peuple via magistrats et assemblées.' },
                    { id: 'hv2', term: 'Principatus (Empire)', definition: 'Régime instauré par Auguste remettant la totalité du pouvoir à l’empereur.' },
                    { id: 'hv3', term: 'Auguste', definition: 'Titre honorifique conférant à Octave une sacralité divine (27 av. J.-C.).' },
                    { id: 'hv4', term: 'Imperator', definition: 'Chef suprême des armées romaines.' },
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
