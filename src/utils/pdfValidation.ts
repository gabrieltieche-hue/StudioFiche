const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

const ACCEPTED_PDF_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'text/x-pdf',
]);

export function hasPdfMagicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  const searchLimit = Math.min(bytes.length - PDF_MAGIC.length, 1024);
  for (let i = 0; i <= searchLimit; i += 1) {
    if (
      bytes[i] === PDF_MAGIC[0] &&
      bytes[i + 1] === PDF_MAGIC[1] &&
      bytes[i + 2] === PDF_MAGIC[2] &&
      bytes[i + 3] === PDF_MAGIC[3] &&
      bytes[i + 4] === PDF_MAGIC[4]
    ) {
      return true;
    }
  }
  return false;
}

export function isAcceptedPdfMetadata(file: { name?: string; type?: string }): boolean {
  const mime = (file.type || '').trim().toLowerCase();
  const name = (file.name || '').trim().toLowerCase();
  return ACCEPTED_PDF_MIME_TYPES.has(mime) || name.endsWith('.pdf');
}

export function ensurePdfFilename(name: string, fallbackIndex = 1): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return `cours-${fallbackIndex}.pdf`;
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

export function validatePdfCandidate(
  file: { name?: string; type?: string; size: number },
  headerBytes?: Uint8Array
): { valid: boolean; reason?: 'empty' | 'not_pdf' } {
  if (file.size === 0) {
    return { valid: false, reason: 'empty' };
  }

  if (headerBytes && headerBytes.length > 0) {
    if (hasPdfMagicHeader(headerBytes)) {
      return { valid: true };
    }
    // If the file has a valid header sample and does NOT contain %PDF-, only trust explicit PDF mime/ext if header was truncated < 5 bytes
    if (headerBytes.length >= PDF_MAGIC.length) {
      return { valid: false, reason: 'not_pdf' };
    }
  }

  if (isAcceptedPdfMetadata(file)) {
    return { valid: true };
  }

  return { valid: false, reason: 'not_pdf' };
}
