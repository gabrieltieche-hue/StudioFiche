import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensurePdfFilename,
  hasPdfMagicHeader,
  isAcceptedPdfMetadata,
  validatePdfCandidate,
} from './pdfValidation';

test('hasPdfMagicHeader detects %PDF- signature at start or after leading whitespace', () => {
  const std = new TextEncoder().encode('%PDF-1.5\n...');
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x20, ...new TextEncoder().encode('%PDF-1.7')]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.equal(hasPdfMagicHeader(std), true);
  assert.equal(hasPdfMagicHeader(withBom), true);
  assert.equal(hasPdfMagicHeader(png), false);
});

test('validatePdfCandidate accepts Android/Drive PDFs lacking .pdf extension and MIME type via magic bytes', () => {
  const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj');
  const result = validatePdfCandidate(
    { name: 'COURS HISTOIRE', type: '', size: 3_830_000 },
    pdfBytes
  );
  assert.deepEqual(result, { valid: true });

  const octetResult = validatePdfCandidate(
    { name: 'MANUEL HISTOIRE', type: 'application/octet-stream', size: 15_580_000 },
    pdfBytes
  );
  assert.deepEqual(octetResult, { valid: true });
});

test('validatePdfCandidate rejects empty Drive stubs and non-PDF binaries', () => {
  const emptyRes = validatePdfCandidate({ name: 'cours.pdf', type: 'application/pdf', size: 0 });
  assert.deepEqual(emptyRes, { valid: false, reason: 'empty' });

  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const fakePdf = validatePdfCandidate(
    { name: 'photo.pdf', type: 'application/pdf', size: 12000 },
    pngBytes
  );
  assert.deepEqual(fakePdf, { valid: false, reason: 'not_pdf' });
});

test('isAcceptedPdfMetadata and ensurePdfFilename handle Drive names cleanly', () => {
  assert.equal(isAcceptedPdfMetadata({ name: 'cours.PDF', type: '' }), true);
  assert.equal(isAcceptedPdfMetadata({ name: 'document', type: 'application/x-pdf' }), true);
  assert.equal(isAcceptedPdfMetadata({ name: 'COURS HISTOIRE', type: '' }), false);
  assert.equal(ensurePdfFilename('COURS HISTOIRE'), 'COURS HISTOIRE.pdf');
  assert.equal(ensurePdfFilename('Manuel.pdf'), 'Manuel.pdf');
});
