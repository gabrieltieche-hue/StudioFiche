import { PDFDocument } from 'pdf-lib';

export interface PdfPageBatch {
  displayName: string;
  batchLabel: string;
  startPage: number;
  endPage: number | null;
  totalPages: number | null;
  buffer: Buffer;
}

export async function splitPdfBufferIntoPageBatches(
  rawBuffer: Buffer | Uint8Array,
  displayName: string,
  pagesPerBatch = 5
): Promise<PdfPageBatch[]> {
  const safeBuf = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);
  const batchSize = Math.max(1, Math.floor(pagesPerBatch));

  try {
    const srcDoc = await PDFDocument.load(safeBuf, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const totalPages = srcDoc.getPageCount();
    if (totalPages <= 0) {
      return [
        {
          displayName,
          batchLabel: displayName,
          startPage: 1,
          endPage: null,
          totalPages: null,
          buffer: safeBuf,
        },
      ];
    }

    if (totalPages <= batchSize) {
      return [
        {
          displayName,
          batchLabel: `${displayName} (p. 1–${totalPages}/${totalPages})`,
          startPage: 1,
          endPage: totalPages,
          totalPages,
          buffer: safeBuf,
        },
      ];
    }

    const batches: PdfPageBatch[] = [];
    for (let startIdx = 0; startIdx < totalPages; startIdx += batchSize) {
      const endIdx = Math.min(totalPages - 1, startIdx + batchSize - 1);
      const pageIndices: number[] = [];
      for (let p = startIdx; p <= endIdx; p += 1) {
        pageIndices.push(p);
      }

      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        subDoc.addPage(page);
      }
      const subBytes = await subDoc.save();
      const startPage = startIdx + 1;
      const endPage = endIdx + 1;

      batches.push({
        displayName,
        batchLabel: `${displayName} (p. ${startPage}–${endPage}/${totalPages})`,
        startPage,
        endPage,
        totalPages,
        buffer: Buffer.from(subBytes),
      });
    }

    return batches;
  } catch {
    return [
      {
        displayName,
        batchLabel: displayName,
        startPage: 1,
        endPage: null,
        totalPages: null,
        buffer: safeBuf,
      },
    ];
  }
}

export function computeTargetCardCount(
  totalPages: number,
  totalExtractedFacts: number,
  requestedCardCount: string
): number {
  if (
    requestedCardCount === '1' ||
    requestedCardCount === '2' ||
    requestedCardCount === '3' ||
    requestedCardCount === '4'
  ) {
    return Number(requestedCardCount);
  }

  const safePages = Math.max(1, totalPages);
  const safeFacts = Math.max(0, totalExtractedFacts);

  // One airy 14x19cm Recto/Verso fiche holds ~18-22 synthesized facts/notions cleanly (82-91% fill).
  const byFacts = Math.ceil(safeFacts / 20);
  const byPages =
    safePages >= 18 ? 4 : safePages >= 11 ? 3 : safePages >= 5 ? 2 : 1;

  return Math.max(1, Math.min(4, Math.max(byFacts, byPages)));
}

export interface BatchInventoryLike {
  batchIndex: number;
  batchLabel: string;
  pages: Array<{
    pageRef: string;
    headings: string[];
    keyFactsAndConcepts: string[];
    formulasAndData?: string[];
    tablesFound?: string[];
    diagramsFound?: string[];
  }>;
}

export function serializeBatchInventoryForPrompt(batches: BatchInventoryLike[]): string {
  const parts: string[] = [];
  for (const b of batches) {
    parts.push(`=== LOT ${b.batchIndex + 1} : ${b.batchLabel} ===`);
    for (const pg of b.pages) {
      const lines = [
        `[${pg.pageRef}]`,
        `- Titres : ${pg.headings.join(' | ') || 'Aucun'}`,
        `- Faits / notions / dates / acteurs / exemples : ${pg.keyFactsAndConcepts.join(' ; ') || 'Aucun'}`,
      ];
      if (pg.formulasAndData?.length) {
        lines.push(`- Formules / valeurs : ${pg.formulasAndData.join(' ; ')}`);
      }
      if (pg.tablesFound?.length) {
        lines.push(`- Tableaux : ${pg.tablesFound.join(' ; ')}`);
      }
      if (pg.diagramsFound?.length) {
        lines.push(`- Schémas / mécanismes : ${pg.diagramsFound.join(' ; ')}`);
      }
      parts.push(lines.join('\n'));
    }
  }
  return parts.join('\n\n');
}

export function selectRelevantBatchIndices(
  assignedIndices: number[],
  totalBatches: number,
  maxBatches = 3
): number[] {
  if (totalBatches <= 0) return [];
  const valid = Array.from(
    new Set(
      assignedIndices.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < totalBatches)
    )
  ).sort((a, b) => a - b);

  if (valid.length === 0) {
    return Array.from({ length: Math.min(totalBatches, maxBatches) }, (_, i) => i);
  }
  return valid.slice(0, Math.max(1, maxBatches));
}

export function collectUncoveredFactLines(
  batches: BatchInventoryLike[],
  assignedFactsList: string[][]
): string[] {
  const assignedJoined = assignedFactsList
    .flat()
    .map((s) => s.toLowerCase())
    .join('\n');

  const uncovered: string[] = [];
  for (const batch of batches) {
    for (const pg of batch.pages) {
      for (const fact of pg.keyFactsAndConcepts) {
        const clean = fact.trim();
        if (clean.length < 10) continue;
        const probe = clean.slice(0, Math.min(28, clean.length)).toLowerCase();
        if (!assignedJoined.includes(probe)) {
          uncovered.push(`[${pg.pageRef}] ${clean}`);
        }
      }
    }
  }
  return uncovered;
}

