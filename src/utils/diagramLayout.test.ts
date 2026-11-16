import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDiagramLayout, wrapDiagramText } from './diagramLayout';

test('wrapDiagramText wraps long labels cleanly at word boundaries into <= 3 lines', () => {
  const lines = wrapDiagramText('Complexe hypothalamo-hypophysaire et rétrocontrôle', 20);
  assert.ok(lines.length >= 2 && lines.length <= 3);
  assert.ok(lines[0].length <= 22);
});

test('Roman Republic diagram prevents upward feedback label clipping and node overlaps', () => {
  const layout = computeDiagramLayout({
    nodes: [
      { id: 'cit', label: 'Citoyens', sublabel: 'Patriciens / Plébéiens', x: 50, y: 15, width: 36, tone: 'blue' },
      { id: 'com', label: 'Comices', sublabel: 'Vote des lois', x: 25, y: 48, width: 34, tone: 'green' },
      { id: 'mag', label: 'Magistrats', sublabel: 'Pouvoir exécutif', x: 75, y: 48, width: 34, tone: 'amber' },
      { id: 'sen', label: 'Sénat', sublabel: 'Conseil et finances', x: 50, y: 84, width: 36, tone: 'slate' },
    ],
    edges: [
      { from: 'cit', to: 'com', label: 'votent aux' },
      { from: 'com', to: 'mag', label: 'élisent' },
      { from: 'mag', to: 'sen', label: 'entrent au', dashed: true },
      { from: 'sen', to: 'com', label: 'conseille' },
    ],
  });

  assert.equal(layout.nodes.length, 4);
  assert.equal(layout.edges.length, 4);

  // Every edge label badge must stay strictly inside [4, width - 4]
  for (const edge of layout.edges) {
    if (edge.label) {
      const badgeLeft = edge.labelX - edge.badgeW / 2;
      const badgeRight = edge.labelX + edge.badgeW / 2;
      assert.ok(
        badgeLeft >= 4,
        `Edge "${edge.label}" clipped on left (${badgeLeft} < 4)`
      );
      assert.ok(
        badgeRight <= layout.width - 4,
        `Edge "${edge.label}" clipped on right (${badgeRight} > ${layout.width - 4})`
      );
    }
    assert.ok(edge.pathD.startsWith('M '), 'Edge must start with M command');
  }

  // No pair of node rectangles may overlap
  for (let i = 0; i < layout.nodes.length; i += 1) {
    for (let j = i + 1; j < layout.nodes.length; j += 1) {
      const a = layout.nodes[i];
      const b = layout.nodes[j];
      const overlaps = !(
        a.right <= b.left ||
        a.left >= b.right ||
        a.bottom <= b.top ||
        a.top >= b.bottom
      );
      assert.equal(overlaps, false, `Nodes ${a.id} and ${b.id} overlap`);
    }
  }
});

test('SVT CHH diagram with grouped compartments keeps groups non-overlapping and feedback rail inside bounds', () => {
  const layout = computeDiagramLayout({
    nodes: [
      { id: 'hypo', label: 'HYPOTHALAMUS', x: 50, y: 8, width: 40, tone: 'blue' },
      { id: 'hypop', label: 'HYPOPHYSE', x: 50, y: 28, width: 38, tone: 'blue' },
      { id: 'leydig', label: 'Cellules de Leydig', x: 32, y: 54, width: 32, tone: 'amber' },
      { id: 'sertoli', label: 'Cellules de Sertoli', x: 70, y: 54, width: 32, tone: 'green' },
      { id: 'testo', label: 'TESTOSTÉRONE', x: 32, y: 74, width: 30, tone: 'amber' },
      { id: 'sperm', label: 'SPERMATOGENÈSE', sublabel: 'Spermatozoïdes', x: 70, y: 74, width: 32, tone: 'green' },
      { id: 'retro', label: 'RÉTROCONTRÔLE NÉGATIF', sublabel: 'Maintien de l’équilibre hormonal', x: 50, y: 94, width: 48, tone: 'slate' },
    ],
    groups: [
      { id: 'g-inter', title: 'TISSU INTERSTITIEL', subtitle: '(Cellules de Leydig)', nodeIds: ['leydig', 'testo'], tone: 'amber' },
      { id: 'g-tubes', title: 'TUBES SÉMINIFÈRES', subtitle: '(Cellules de Sertoli)', nodeIds: ['sertoli', 'sperm'], tone: 'green' },
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
  });

  assert.equal(layout.groups.length, 2);
  const [g1, g2] = layout.groups;
  assert.ok(g1.x + g1.width < g2.x, 'Side-by-side group containers must have clear gutter');

  const feedbackEdge = layout.edges.find((e) => e.from === 'retro' && e.to === 'hypo');
  assert.ok(feedbackEdge);
  assert.ok(feedbackEdge.labelX - feedbackEdge.badgeW / 2 >= 4);
  assert.ok(feedbackEdge.pathD.includes('Q '), 'Feedback edge should have rounded orthogonal corners');

  const lhEdge = layout.edges.find((e) => e.label === 'LH');
  const fshEdge = layout.edges.find((e) => e.label === 'FSH');
  assert.ok(lhEdge && fshEdge);
  assert.ok(lhEdge.labelY + lhEdge.badgeH / 2 <= g1.y + 1, 'LH badge must sit cleanly above group 1 header');
  assert.ok(fshEdge.labelY + fshEdge.badgeH / 2 <= g2.y + 1, 'FSH badge must sit cleanly above group 2 header');
  assert.ok(layout.height <= 265, `Expected compact grouped diagram height <= 265, got ${layout.height}`);
});

test('Roman Republic diagram stays compact vertically for card integration', () => {
  const layout = computeDiagramLayout({
    nodes: [
      { id: 'cit', label: 'Citoyens', sublabel: 'Patriciens / Plébéiens', x: 50, y: 15, width: 36, tone: 'blue' },
      { id: 'com', label: 'Comices', sublabel: 'Vote des lois', x: 25, y: 48, width: 34, tone: 'green' },
      { id: 'mag', label: 'Magistrats', sublabel: 'Pouvoir exécutif', x: 75, y: 48, width: 34, tone: 'amber' },
      { id: 'sen', label: 'Sénat', sublabel: 'Conseil et finances', x: 50, y: 84, width: 36, tone: 'slate' },
    ],
    edges: [
      { from: 'cit', to: 'com', label: 'votent aux' },
      { from: 'com', to: 'mag', label: 'élisent' },
      { from: 'mag', to: 'sen', label: 'entrent au', dashed: true },
      { from: 'sen', to: 'com', label: 'conseille' },
    ],
  });
  assert.ok(layout.height <= 215, `Expected compact Roman Republic height <= 215, got ${layout.height}`);
});

test('Cross-column upward connector routes cleanly through center gutter without crossing sibling nodes', () => {
  const layout = computeDiagramLayout({
    nodes: [
      { id: 'comices', label: 'Comices (peuple)', sublabel: 'Votent lois, élisent', x: 26, y: 16, width: 34, tone: 'blue' },
      { id: 'magistrats', label: 'Magistrats', sublabel: 'Consuls, préteurs', x: 26, y: 44, width: 34, tone: 'blue' },
      { id: 'senat', label: 'Sénat', sublabel: 'Trésor, politique', x: 26, y: 72, width: 34, tone: 'blue' },
      { id: 'auguste', label: 'Auguste (-27)', sublabel: 'Princeps, Imperator', x: 74, y: 44, width: 36, tone: 'amber' },
      { id: 'principat', label: 'Principat / Empire', sublabel: 'Pouvoir concentré', x: 74, y: 72, width: 36, tone: 'red' },
    ],
    edges: [
      { from: 'comices', to: 'magistrats', label: 'élisent' },
      { from: 'magistrats', to: 'senat', label: 'intègrent' },
      { from: 'senat', to: 'auguste', label: 'titre en -27' },
      { from: 'auguste', to: 'principat', label: 'fonde' },
    ],
    groups: [
      { id: 'rep', title: 'République (-509 à -27)', nodeIds: ['comices', 'magistrats', 'senat'], tone: 'blue' },
      { id: 'emp', title: 'Concentration du pouvoir', nodeIds: ['auguste', 'principat'], tone: 'amber' },
    ],
  });

  const mag = layout.nodes.find((n) => n.id === 'magistrats')!;
  const aug = layout.nodes.find((n) => n.id === 'auguste')!;
  const crossEdge = layout.edges.find((e) => e.from === 'senat' && e.to === 'auguste')!;
  assert.ok(crossEdge);
  assert.ok(crossEdge.labelX > mag.right && crossEdge.labelX < aug.left, 'Cross-column connector must route through the center gutter');
});
