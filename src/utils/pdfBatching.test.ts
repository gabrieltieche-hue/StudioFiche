import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  collectUncoveredFactLines,
  computeTargetCardCount,
  selectRelevantBatchIndices,
  serializeBatchInventoryForPrompt,
  splitPdfBufferIntoPageBatches,
} from './pdfBatching';

test('splitPdfBufferIntoPageBatches splits a 12-page PDF into 5-page batches', async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 12; i += 1) {
    doc.addPage([400, 600]);
  }
  const bytes = await doc.save();

  const batches = await splitPdfBufferIntoPageBatches(bytes, 'Manuel_Rome.pdf', 5);
  assert.equal(batches.length, 3);
  assert.equal(batches[0].startPage, 1);
  assert.equal(batches[0].endPage, 5);
  assert.equal(batches[0].totalPages, 12);
  assert.equal(batches[1].startPage, 6);
  assert.equal(batches[1].endPage, 10);
  assert.equal(batches[2].startPage, 11);
  assert.equal(batches[2].endPage, 12);

  // Each split PDF must be valid and loadable with expected page count
  const b0Doc = await PDFDocument.load(batches[0].buffer);
  const b2Doc = await PDFDocument.load(batches[2].buffer);
  assert.equal(b0Doc.getPageCount(), 5);
  assert.equal(b2Doc.getPageCount(), 2);
});

test('splitPdfBufferIntoPageBatches falls back gracefully on non-standard binary', async () => {
  const fallback = await splitPdfBufferIntoPageBatches(
    Buffer.from('%PDF-1.4 malformed-body'),
    'Scan.pdf',
    5
  );
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].displayName, 'Scan.pdf');
  assert.equal(fallback[0].endPage, null);
});

test('computeTargetCardCount scales cards proportionally to pages & extracted facts in auto mode', () => {
  assert.equal(computeTargetCardCount(2, 14, 'auto'), 1);
  assert.equal(computeTargetCardCount(6, 28, 'auto'), 1);
  assert.equal(computeTargetCardCount(8, 42, 'auto'), 2);
  assert.equal(computeTargetCardCount(14, 72, 'auto'), 3);
  assert.equal(computeTargetCardCount(22, 110, 'auto'), 4);
  assert.equal(computeTargetCardCount(28, 90, '2'), 2);
});

test('selectRelevantBatchIndices bounds, deduplicates, and falls back when empty', () => {
  assert.deepEqual(selectRelevantBatchIndices([3, 1, 1, 99, -1, 0], 6, 3), [0, 1, 3]);
  assert.deepEqual(selectRelevantBatchIndices([], 5, 3), [0, 1, 2]);
});

test('collectUncoveredFactLines catches omitted facts across page batches', () => {
  const batches = [
    {
      batchIndex: 0,
      batchLabel: 'Manuel (p. 1-5)',
      pages: [
        {
          pageRef: 'Manuel p. 2',
          headings: ['La ville romaine'],
          keyFactsAndConcepts: [
            'La cité de Timgad fondée par Trajan en 100 suit un plan en damier (cardo et decumanus).',
            'En 212, l’édit de Caracalla accorde la citoyenneté romaine à tous les hommes libres.',
          ],
        },
      ],
    },
  ];
  const serialized = serializeBatchInventoryForPrompt(batches);
  assert.ok(serialized.includes('Manuel p. 2'));
  const uncovered = collectUncoveredFactLines(batches, [
    ['En 212, l’édit de Caracalla accorde la citoyenneté romaine'],
  ]);
  assert.equal(uncovered.length, 1);
  assert.ok(uncovered[0].includes('Timgad'));
});

