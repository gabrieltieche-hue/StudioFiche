import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  estimateSideDensity,
  markupToSpans,
  normalizeRomanNumeral,
  rebalanceCardLayout,
  sanitizeDiagramData,
  SUBJECT_PALETTES,
} from './src/utils/ficheLogic';
import {
  collectUncoveredFactLines,
  computeTargetCardCount,
  selectRelevantBatchIndices,
  serializeBatchInventoryForPrompt,
  splitPdfBufferIntoPageBatches,
  type BatchInventoryLike,
} from './src/utils/pdfBatching';
import { ensurePdfFilename, validatePdfCandidate } from './src/utils/pdfValidation';
import type { FicheCard, FicheDeck, SubjectKey } from './src/types/fiche';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 35 * 1024 * 1024, // 35 MB per PDF
    files: 5,
  },
});

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY manquante dans les secrets de configuration.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('ECONNRESET') ||
    raw.includes('ETIMEDOUT') ||
    raw.includes('fetch failed')
  );
}

function formatUserFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.';
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'Le moteur d’analyse est temporairement très sollicité (pic de charge 503). Réessayez dans quelques secondes.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Quota de requêtes temporairement atteint. Patientez quelques instants puis réessayez.';
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return 'Clé API invalide ou accès refusé. Vérifiez la configuration dans les secrets.';
  }
  return raw;
}

const blockSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      description: 'One of: paragraph, bulletList, formulaBox, table, vocabList, diagram',
    },
    text: {
      type: Type.STRING,
      description:
        'For paragraph: text using [rouge]mot[/rouge] for red bold keywords, **bold**, __underline__.',
    },
    bulletItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.INTEGER },
          text: { type: Type.STRING },
        },
        required: ['level', 'text'],
      },
    },
    vocabItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
        },
        required: ['term', 'definition'],
      },
    },
    title: { type: Type.STRING },
    formula: { type: Type.STRING },
    caption: { type: Type.STRING },
    headers: { type: Type.ARRAY, items: { type: Type.STRING } },
    rows: {
      type: Type.ARRAY,
      items: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    nodes: {
      type: Type.ARRAY,
      description:
        'OBLIGATOIRE et NON VIDE (3 à 7 objets) si type==="diagram" : nœuds du schéma vectoriel.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Identifiant court unique, ex: n1, n2, n3' },
          label: { type: Type.STRING, description: 'Libellé concis <= 32 caractères' },
          sublabel: { type: Type.STRING, description: 'Sous-titre court optionnel <= 34 caractères' },
          x: { type: Type.NUMBER, description: 'Coordonnée horizontale entre 18 et 82' },
          y: { type: Type.NUMBER, description: 'Coordonnée verticale entre 10 et 92' },
          width: { type: Type.NUMBER, description: 'Largeur en % entre 26 et 48' },
          tone: { type: Type.STRING, description: 'Uniquement : blue, amber, green, red, slate' },
        },
        required: ['id', 'label', 'x', 'y'],
      },
    },
    edges: {
      type: Type.ARRAY,
      description:
        'OBLIGATOIRE (au moins 2 flèches) si type==="diagram" : liaisons entre nœuds via leurs id exacts.',
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
          dashed: { type: Type.BOOLEAN },
        },
        required: ['from', 'to'],
      },
    },
    groups: {
      type: Type.ARRAY,
      description:
        'Optionnel : cadres regroupant plusieurs nœuds (ex: deux compartiments ou colonnes parallèles).',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          nodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          tone: { type: Type.STRING },
        },
        required: ['id', 'title', 'nodeIds'],
      },
    },
    footnote: { type: Type.STRING },
  },
  required: ['type'],
};

const diagramRepairSchema = {
  type: Type.OBJECT,
  properties: {
    diagrams: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          targetKey: { type: Type.STRING },
          title: { type: Type.STRING },
          footnote: { type: Type.STRING },
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                sublabel: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                tone: { type: Type.STRING },
              },
              required: ['id', 'label', 'x', 'y'],
            },
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING },
                label: { type: Type.STRING },
                dashed: { type: Type.BOOLEAN },
              },
              required: ['from', 'to'],
            },
          },
          groups: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                nodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                tone: { type: Type.STRING },
              },
              required: ['id', 'title', 'nodeIds'],
            },
          },
        },
        required: ['targetKey', 'title', 'nodes', 'edges'],
      },
    },
  },
  required: ['diagrams'],
};

const batchInventorySchema = {
  type: Type.OBJECT,
  properties: {
    pages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pageRef: { type: Type.STRING, description: 'Ex: Manuel p. 6 ou Cours p. 2' },
          headings: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyFactsAndConcepts: {
            type: Type.ARRAY,
            description:
              'TOUS les faits, notions, dates avec contexte, personnages, définitions, arguments, causes, conséquences, extraits de documents et exemples présents sur cette page (y compris manuscrits, en marge ou encadrés).',
            items: { type: Type.STRING },
          },
          formulasAndData: { type: Type.ARRAY, items: { type: Type.STRING } },
          tablesFound: { type: Type.ARRAY, items: { type: Type.STRING } },
          diagramsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['pageRef', 'headings', 'keyFactsAndConcepts'],
      },
    },
  },
  required: ['pages'],
};

const sectionSchema = {
  type: Type.OBJECT,
  properties: {
    romanNumeral: { type: Type.STRING },
    title: { type: Type.STRING },
    isSubHeader: { type: Type.BOOLEAN },
    blocks: { type: Type.ARRAY, items: blockSchema },
  },
  required: ['romanNumeral', 'title', 'blocks'],
};

const coveragePlanSchema = {
  type: Type.OBJECT,
  properties: {
    deckTitle: { type: Type.STRING },
    keyVisualSchemas: {
      type: Type.ARRAY,
      description: 'Mécanismes, institutions ou tableaux clés repérés dans les PDF.',
      items: { type: Type.STRING },
    },
    verificationNotes: {
      type: Type.STRING,
      description: 'Audit confirmant que 100 % des pages et notions des lots sont réparties.',
    },
    cardsPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          generatedPrompt: { type: Type.STRING },
          assignedBatchIndices: {
            type: Type.ARRAY,
            description: 'Indices 0-based des lots PDF principaux à rattacher à cette fiche.',
            items: { type: Type.INTEGER },
          },
          focusTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          rectoOutline: {
            type: Type.STRING,
            description: 'Plan détaillé du RECTO (I. et II.)',
          },
          versoOutline: {
            type: Type.STRING,
            description: 'Plan détaillé du VERSO (III. et IV. À retenir / Vocabulaire / Schéma / Tableau)',
          },
          assignedFactsVerbatim: {
            type: Type.ARRAY,
            description:
              'Liste EXHAUSTIVE de tous les faits, dates, acteurs, définitions, exemples et chiffres extraits devant impérativement figurer dans cette fiche.',
            items: { type: Type.STRING },
          },
          shouldIncludeDiagram: { type: Type.BOOLEAN },
          diagramDescription: { type: Type.STRING },
          shouldIncludeTable: { type: Type.BOOLEAN },
        },
        required: [
          'title',
          'generatedPrompt',
          'assignedBatchIndices',
          'focusTopics',
          'rectoOutline',
          'versoOutline',
          'assignedFactsVerbatim',
          'shouldIncludeDiagram',
        ],
      },
    },
  },
  required: ['deckTitle', 'verificationNotes', 'cardsPlan'],
};

const singleCardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    generatedPrompt: { type: Type.STRING },
    leftSide: {
      type: Type.OBJECT,
      properties: {
        sections: { type: Type.ARRAY, items: sectionSchema },
      },
      required: ['sections'],
    },
    rightSide: {
      type: Type.OBJECT,
      properties: {
        sections: { type: Type.ARRAY, items: sectionSchema },
      },
      required: ['sections'],
    },
  },
  required: ['title', 'generatedPrompt', 'leftSide', 'rightSide'],
};

interface PlannedPrompt {
  title: string;
  promptText: string;
}

interface GenerationJob {
  id: string;
  status: 'running' | 'done' | 'error';
  stageMessage: string;
  startedAt: number;
  updatedAt: number;
  plannedPrompts?: PlannedPrompt[];
  deck?: FicheDeck;
  error?: string;
}

interface ChunkUploadSession {
  displayName: string;
  totalChunks: number;
  totalSize: number;
  chunks: (Buffer | null)[];
  updatedAt: number;
}

interface CachedUploadedPdf {
  buffer: Buffer;
  displayName: string;
  createdAt: number;
}

const generationJobs = new Map<string, GenerationJob>();
const chunkUploadSessions = new Map<string, ChunkUploadSession>();
const uploadedPdfBufferCache = new Map<string, CachedUploadedPdf>();
const JOB_TTL_MS = 15 * 60 * 1000;
const UPLOAD_CACHE_TTL_MS = 25 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [jobId, job] of generationJobs.entries()) {
    if (job.updatedAt < cutoff) {
      generationJobs.delete(jobId);
    }
  }
  for (const [uploadId, session] of chunkUploadSessions.entries()) {
    if (session.updatedAt < cutoff) {
      chunkUploadSessions.delete(uploadId);
    }
  }
  const cacheCutoff = Date.now() - UPLOAD_CACHE_TTL_MS;
  for (const [cacheId, entry] of uploadedPdfBufferCache.entries()) {
    if (entry.createdAt < cacheCutoff) {
      uploadedPdfBufferCache.delete(cacheId);
    }
  }
}, 2 * 60 * 1000).unref();

function storePdfBufferInCache(buffer: Buffer, displayName: string): string {
  // Bound total cached entries to prevent excessive RAM usage
  if (uploadedPdfBufferCache.size >= 16) {
    const oldestKey = uploadedPdfBufferCache.keys().next().value;
    if (oldestKey) uploadedPdfBufferCache.delete(oldestKey);
  }
  const cacheId = crypto.randomUUID();
  uploadedPdfBufferCache.set(cacheId, {
    buffer,
    displayName,
    createdAt: Date.now(),
  });
  return cacheId;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIdx = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const current = nextIdx;
        nextIdx += 1;
        if (current >= items.length) break;
        results[current] = await worker(items[current], current);
      }
    })
  );
  return results;
}

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4 MB max per chunk
    files: 1,
  },
});

function sanitizeGeneratedBlocks(blocks: Record<string, unknown>[], prefix: string) {
  return (blocks || []).map((raw, bIdx) => {
    const id = typeof raw.id === 'string' && raw.id ? raw.id : `${prefix}-b-${bIdx}`;
    const type = String(raw.type || 'paragraph');

    if (type === 'bulletList') {
      const rawItems = Array.isArray(raw.bulletItems)
        ? raw.bulletItems
        : Array.isArray(raw.items)
          ? raw.items
          : [];
      return {
        id,
        type: 'bulletList' as const,
        items: rawItems.map((it: Record<string, unknown>, iIdx: number) => ({
          id: typeof it.id === 'string' && it.id ? it.id : `${id}-i-${iIdx}`,
          level: it.level === 2 ? (2 as const) : (1 as const),
          spans:
            typeof it.text === 'string'
              ? markupToSpans(it.text)
              : Array.isArray(it.spans) && it.spans.length > 0
                ? it.spans
                : [{ text: String(it.term || it.definition || ''), tone: 'normal' as const }],
        })),
      };
    }

    if (type === 'formulaBox') {
      return {
        id,
        type: 'formulaBox' as const,
        title: typeof raw.title === 'string' ? raw.title : undefined,
        formula: typeof raw.formula === 'string' ? raw.formula : '',
        caption: typeof raw.caption === 'string' ? raw.caption : undefined,
      };
    }

    if (type === 'table') {
      return {
        id,
        type: 'table' as const,
        headers: Array.isArray(raw.headers) ? raw.headers.map(String) : [],
        rows: Array.isArray(raw.rows)
          ? raw.rows.map((r) => (Array.isArray(r) ? r.map(String) : []))
          : [],
      };
    }

    if (type === 'vocabList') {
      const rawItems = Array.isArray(raw.vocabItems)
        ? raw.vocabItems
        : Array.isArray(raw.items)
          ? raw.items
          : [];
      return {
        id,
        type: 'vocabList' as const,
        items: rawItems.map((it: Record<string, unknown>, iIdx: number) => ({
          id: typeof it.id === 'string' && it.id ? it.id : `${id}-v-${iIdx}`,
          term: String(it.term || 'Notion').replace(/\[\/?rouge\]/g, ''),
          definition: String(it.definition || '').replace(/\[\/?rouge\]/g, ''),
        })),
      };
    }

    if (type === 'diagram') {
      const sanitized = sanitizeDiagramData({
        title: typeof raw.title === 'string' ? raw.title : 'Schéma-bilan',
        nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
        edges: Array.isArray(raw.edges) ? raw.edges : [],
        groups: Array.isArray(raw.groups) ? raw.groups : undefined,
        footnote: typeof raw.footnote === 'string' ? raw.footnote : undefined,
      });
      if (sanitized.nodes.length === 0) {
        return null;
      }
      return {
        id,
        type: 'diagram' as const,
        ...sanitized,
      };
    }

    return {
      id,
      type: 'paragraph' as const,
      spans:
        typeof raw.text === 'string'
          ? markupToSpans(raw.text)
          : Array.isArray(raw.spans) && raw.spans.length > 0
            ? raw.spans
            : [{ text: String(raw.formula || raw.title || ''), tone: 'normal' as const }],
    };
  }).filter((blk): blk is NonNullable<typeof blk> => blk !== null);
}

async function uploadBufferToGeminiFiles(
  ai: GoogleGenAI,
  buffer: Buffer,
  displayName: string
): Promise<{ uri: string; name: string; mimeType: string }> {
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
  const uploaded = await ai.files.upload({
    file: blob,
    config: {
      mimeType: 'application/pdf',
      displayName: ensurePdfFilename(displayName),
    },
  });

  if (!uploaded.uri || !uploaded.name) {
    throw new Error(`Échec de l'envoi du fichier ${displayName} vers le service d'analyse.`);
  }

  let current = uploaded;
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts && current.state === 'PROCESSING'; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    current = await ai.files.get({ name: current.name! });
  }

  if (current.state === 'FAILED') {
    throw new Error(`Le fichier PDF "${displayName}" n'a pas pu être traité par le lecteur PDF.`);
  }

  return {
    uri: current.uri || uploaded.uri,
    name: current.name || uploaded.name,
    mimeType: 'application/pdf',
  };
}

function handleMulterUpload(
  middleware: express.RequestHandler
): express.RequestHandler {
  return (req, res, next) => {
    middleware(req, res, (err: unknown) => {
      if (err) {
        const msg =
          err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
            ? 'Un fichier dépasse la limite de 35 Mo par PDF.'
            : err instanceof Error
              ? err.message
              : 'Erreur lors du transfert du fichier PDF.';
        res.status(400).json({ error: msg });
        return;
      }
      next();
    });
  };
}

const STUDIO_DATA_DIR = path.resolve(__dirname, '.data');
const STUDIO_DECKS_FILE = path.join(STUDIO_DATA_DIR, 'studio-decks.json');

async function readStudioDecks(): Promise<FicheDeck[]> {
  try {
    const raw = await fs.readFile(STUDIO_DECKS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FicheDeck[]) : [];
  } catch {
    return [];
  }
}

async function writeStudioDecks(decks: FicheDeck[]): Promise<void> {
  await fs.mkdir(STUDIO_DATA_DIR, { recursive: true });
  await fs.writeFile(STUDIO_DECKS_FILE, JSON.stringify(decks, null, 2), 'utf8');
}

async function upsertStudioDeck(deck: FicheDeck): Promise<void> {
  const existing = await readStudioDecks();
  const next = [deck, ...existing.filter((d) => d.id !== deck.id)].slice(0, 80);
  await writeStudioDecks(next);
}

async function removeStudioDeck(deckId: string): Promise<void> {
  const existing = await readStudioDecks();
  const next = existing.filter((d) => d.id !== deckId);
  await writeStudioDecks(next);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.get('/api/decks', async (_req, res) => {
    const decks = await readStudioDecks();
    res.json({ decks });
  });

  app.post('/api/decks', async (req, res) => {
    try {
      const deck = req.body?.deck as FicheDeck | undefined;
      if (!deck || !deck.id || !Array.isArray(deck.cards)) {
        res.status(400).json({ error: 'Objet deck invalide.' });
        return;
      }
      await upsertStudioDeck(deck);
      res.json({ ok: true, id: deck.id });
    } catch (err: unknown) {
      res.status(500).json({ error: formatUserFriendlyError(err) });
    }
  });

  app.delete('/api/decks/:id', async (req, res) => {
    try {
      await removeStudioDeck(req.params.id);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ error: formatUserFriendlyError(err) });
    }
  });

  app.post('/api/upload-pdf', handleMulterUpload(upload.single('pdf')), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Aucun fichier PDF reçu.' });
        return;
      }

      const check = validatePdfCandidate(
        { name: file.originalname, type: file.mimetype, size: file.size },
        new Uint8Array(file.buffer.subarray(0, 1024))
      );
      if (!check.valid) {
        res.status(400).json({
          error:
            check.reason === 'empty'
              ? `Le fichier « ${file.originalname} » est vide.`
              : `Le fichier « ${file.originalname} » ne semble pas être un PDF valide.`,
        });
        return;
      }

      const ai = createGeminiClient();
      const displayName = ensurePdfFilename(file.originalname);
      const uploaded = await uploadBufferToGeminiFiles(ai, file.buffer, displayName);
      const localCacheId = storePdfBufferInCache(Buffer.from(file.buffer), displayName);
      res.json({
        ...uploaded,
        displayName,
        size: file.size,
        localCacheId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du transfert du PDF.';
      console.error('[/api/upload-pdf] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/upload-pdf/chunk', handleMulterUpload(chunkUpload.single('chunk')), (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Fragment PDF manquant.' });
        return;
      }

      const uploadId = String(req.body.uploadId || '').trim();
      const chunkIndex = Number(req.body.chunkIndex);
      const totalChunks = Number(req.body.totalChunks);
      const totalSize = Number(req.body.totalSize || file.size);
      const fileName = String(req.body.fileName || file.originalname || 'document.pdf');

      if (
        !uploadId ||
        uploadId.length > 80 ||
        !Number.isInteger(chunkIndex) ||
        !Number.isInteger(totalChunks) ||
        totalChunks < 1 ||
        totalChunks > 40 ||
        chunkIndex < 0 ||
        chunkIndex >= totalChunks
      ) {
        res.status(400).json({ error: 'Paramètres de fragment PDF invalides.' });
        return;
      }

      if (chunkIndex === 0) {
        const check = validatePdfCandidate(
          { name: fileName, type: 'application/pdf', size: totalSize },
          new Uint8Array(file.buffer.subarray(0, 1024))
        );
        if (!check.valid) {
          res.status(400).json({
            error:
              check.reason === 'empty'
                ? `Le fichier « ${fileName} » est vide.`
                : `Le fichier « ${fileName} » ne semble pas être un PDF valide.`,
          });
          return;
        }
      }

      let session = chunkUploadSessions.get(uploadId);
      if (!session || session.totalChunks !== totalChunks) {
        session = {
          displayName: ensurePdfFilename(fileName),
          totalChunks,
          totalSize,
          chunks: new Array<Buffer | null>(totalChunks).fill(null),
          updatedAt: Date.now(),
        };
        chunkUploadSessions.set(uploadId, session);
      }

      session.chunks[chunkIndex] = Buffer.from(file.buffer);
      session.updatedAt = Date.now();

      const receivedChunks = session.chunks.filter((c) => c !== null).length;
      res.json({ ok: true, receivedChunks, totalChunks });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réception du fragment.';
      console.error('[/api/upload-pdf/chunk] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/upload-pdf/complete', async (req, res) => {
    try {
      const uploadId = String(req.body?.uploadId || '').trim();
      const session = chunkUploadSessions.get(uploadId);
      if (!session) {
        res.status(404).json({ error: 'Session de transfert introuvable ou expirée.' });
        return;
      }

      const missingIndex = session.chunks.findIndex((c) => c === null);
      if (missingIndex !== -1) {
        res.status(400).json({
          error: `Transfert incomplet : fragment ${missingIndex + 1}/${session.totalChunks} manquant.`,
        });
        return;
      }

      const fullBuffer = Buffer.concat(session.chunks as Buffer[]);
      chunkUploadSessions.delete(uploadId);

      const check = validatePdfCandidate(
        { name: session.displayName, type: 'application/pdf', size: fullBuffer.length },
        new Uint8Array(fullBuffer.subarray(0, 1024))
      );
      if (!check.valid) {
        res.status(400).json({
          error: `Le fichier « ${session.displayName} » ne semble pas être un PDF valide.`,
        });
        return;
      }

      const ai = createGeminiClient();
      const uploaded = await uploadBufferToGeminiFiles(ai, fullBuffer, session.displayName);
      const localCacheId = storePdfBufferInCache(fullBuffer, session.displayName);
      res.json({
        ...uploaded,
        displayName: session.displayName,
        size: fullBuffer.length,
        localCacheId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l’assemblage du PDF.';
      console.error('[/api/upload-pdf/complete] Error:', message);
      res.status(500).json({ error: formatUserFriendlyError(err) });
    }
  });

  app.get('/api/jobs/:jobId', (req, res) => {
    const job = generationJobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Tâche introuvable ou expirée.' });
      return;
    }
    res.json({
      jobId: job.id,
      status: job.status,
      stageMessage: job.stageMessage,
      elapsedMs: Date.now() - job.startedAt,
      plannedPrompts: job.plannedPrompts,
      deck: job.deck,
      error: job.error,
    });
  });

  app.post('/api/generate-fiches', handleMulterUpload(upload.array('pdfs', 5)), async (req, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      let preUploadedFiles: Array<{
        uri: string;
        name?: string;
        mimeType?: string;
        displayName?: string;
        localCacheId?: string;
      }> = [];
      if (typeof req.body.uploadedFiles === 'string' && req.body.uploadedFiles.trim()) {
        try {
          const parsed = JSON.parse(req.body.uploadedFiles);
          if (Array.isArray(parsed)) {
            preUploadedFiles = parsed.filter((item) => item && typeof item.uri === 'string');
          }
        } catch {
          res.status(400).json({ error: 'Format uploadedFiles invalide.' });
          return;
        }
      }

      if (files.length === 0 && preUploadedFiles.length === 0) {
        res.status(400).json({
          error: 'Veuillez importer au moins un fichier PDF de cours ou de manuel.',
        });
        return;
      }

      for (const file of files) {
        const check = validatePdfCandidate(
          { name: file.originalname, type: file.mimetype, size: file.size },
          new Uint8Array(file.buffer.subarray(0, 1024))
        );
        if (!check.valid) {
          res.status(400).json({
            error:
              check.reason === 'empty'
                ? `Le fichier « ${file.originalname} » est vide.`
                : `Le fichier « ${file.originalname} » n'est pas reconnu comme un PDF valide.`,
          });
          return;
        }
      }

      const ai = createGeminiClient();
      const className = String(req.body.className || '2ndE').trim() || '2ndE';
      const subjectRaw = String(req.body.subject || 'SVT').trim();
      const subject: SubjectKey =
        subjectRaw in SUBJECT_PALETTES ? (subjectRaw as SubjectKey) : 'Autre';
      const dateLabel = String(req.body.dateLabel || '').trim() || '14/11';
      const topic = String(req.body.topic || '').trim() || 'Chapitre complet des sources jointes';
      const cardCount = String(req.body.cardCount || 'auto');
      const metaPrompt = String(req.body.metaPrompt || '').trim();
      const metaPromptName = String(req.body.metaPromptName || 'Méta-Prompt NotebookLM');
      const extraInstructions = String(req.body.extraInstructions || '').trim();
      const visualStyle = req.body.visualStyle === '3eB' ? '3eB' : '2ndE';

      const bufferedFiles = files.map((f) => ({
        originalname: ensurePdfFilename(f.originalname),
        size: f.size,
        buffer: Buffer.from(f.buffer),
      }));

      const jobId = crypto.randomUUID();
      const nowMs = Date.now();
      const job: GenerationJob = {
        id: jobId,
        status: 'running',
        stageMessage: '1/4 Découpage des PDF par lots de 5 pages...',
        startedAt: nowMs,
        updatedAt: nowMs,
      };
      generationJobs.set(jobId, job);

      void (async () => {
        const geminiFileNamesToCleanup: string[] = preUploadedFiles
          .map((pf) => pf.name)
          .filter((n): n is string => Boolean(n));
        const consumedLocalCacheIds: string[] = preUploadedFiles
          .map((pf) => pf.localCacheId)
          .filter((id): id is string => Boolean(id));

        const setStage = (msg: string) => {
          job.stageMessage = msg;
          job.updatedAt = Date.now();
        };

        type GeminiContentPart =
          | { text: string }
          | { inlineData: { mimeType: string; data: string } }
          | { fileData: { fileUri: string; mimeType: string } };

        const callGeminiJson = async (
          stageLabel: string,
          parts: GeminiContentPart[],
          schema: Record<string, unknown>,
          thinkingLevel: ThinkingLevel
        ) => {
          const attempts: Array<{ model: string; waitMs: number; useThinking: boolean }> = [
            { model: 'gemini-4-hydrogen', waitMs: 2500, useThinking: true },
            { model: 'gemini-4-hydrogen', waitMs: 5000, useThinking: true },
            { model: 'gemini-4-hydrogen', waitMs: 7500, useThinking: true },
            { model: 'gemini-3.1-flash-lite', waitMs: 0, useThinking: false },
          ];
          let lastErr: unknown;
          for (let i = 0; i < attempts.length; i += 1) {
            const cfg = attempts[i];
            try {
              return await ai.models.generateContent({
                model: cfg.model,
                contents: { parts },
                config: {
                  ...(cfg.useThinking ? { thinkingConfig: { thinkingLevel } } : {}),
                  responseMimeType: 'application/json',
                  responseSchema: schema,
                },
              });
            } catch (genErr) {
              lastErr = genErr;
              console.warn(
                `[/api/generate-fiches job ${jobId}] Attempt ${i + 1} (${cfg.model}) failed:`,
                genErr instanceof Error ? genErr.message : String(genErr)
              );
              if (i < attempts.length - 1 && isTransientGeminiError(genErr)) {
                setStage(
                  i === attempts.length - 2
                    ? 'Basculement de secours sur le moteur haute disponibilité...'
                    : `Pic de charge passager, nouvelle tentative (${i + 2}/${attempts.length})...`
                );
                if (cfg.waitMs > 0) {
                  await new Promise((r) => setTimeout(r, cfg.waitMs));
                }
                setStage(stageLabel);
                continue;
              }
              throw genErr;
            }
          }
          throw lastErr ?? new Error('Aucune réponse reçue du modèle.');
        };

        try {
          interface PreparedBatch {
            batchIndex: number;
            displayName: string;
            batchLabel: string;
            startPage: number;
            endPage: number | null;
            totalPages: number | null;
            part: GeminiContentPart;
          }

          const preparedBatches: PreparedBatch[] = [];
          let totalKnownPages = 0;

          const enqueueBufferBatches = async (buf: Buffer, displayName: string) => {
            const split = await splitPdfBufferIntoPageBatches(buf, displayName, 5);
            if (split[0]?.totalPages) {
              totalKnownPages += split[0].totalPages;
            } else {
              totalKnownPages += split.length * 4;
            }
            for (const b of split) {
              let part: GeminiContentPart;
              if (b.buffer.length <= 3.5 * 1024 * 1024) {
                part = {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: b.buffer.toString('base64'),
                  },
                };
              } else {
                const uploaded = await uploadBufferToGeminiFiles(ai, b.buffer, b.batchLabel);
                geminiFileNamesToCleanup.push(uploaded.name);
                part = {
                  fileData: {
                    fileUri: uploaded.uri,
                    mimeType: 'application/pdf',
                  },
                };
              }
              preparedBatches.push({
                batchIndex: preparedBatches.length,
                displayName: b.displayName,
                batchLabel: b.batchLabel,
                startPage: b.startPage,
                endPage: b.endPage,
                totalPages: b.totalPages,
                part,
              });
            }
          };

          for (const pf of preUploadedFiles) {
            const name = ensurePdfFilename(pf.displayName || 'document.pdf');
            const cached = pf.localCacheId ? uploadedPdfBufferCache.get(pf.localCacheId) : undefined;
            if (cached) {
              await enqueueBufferBatches(cached.buffer, cached.displayName || name);
            } else {
              totalKnownPages += 6;
              preparedBatches.push({
                batchIndex: preparedBatches.length,
                displayName: name,
                batchLabel: name,
                startPage: 1,
                endPage: null,
                totalPages: null,
                part: {
                  fileData: {
                    fileUri: pf.uri,
                    mimeType: pf.mimeType || 'application/pdf',
                  },
                },
              });
            }
          }

          for (const bf of bufferedFiles) {
            await enqueueBufferBatches(bf.buffer, bf.originalname);
          }

          const sourceNames = [
            ...preUploadedFiles.map((pf) => ensurePdfFilename(pf.displayName || 'document.pdf')),
            ...bufferedFiles.map((f) => f.originalname),
          ];

          // =========================================================================
          // STAGE 1 : EXHAUSTIVE PAGE-BY-PAGE EXTRACTION (5 PAGES MAX PER CALL)
          // =========================================================================
          let completedBatches = 0;
          setStage(
            `1/4 Lecture intégrale page par page (0/${preparedBatches.length} lots)...`
          );

          const batchInventories: BatchInventoryLike[] = await runWithConcurrency(
            preparedBatches,
            3,
            async (batch) => {
              const pageWindow =
                batch.endPage !== null
                  ? `pages ${batch.startPage} à ${batch.endPage} (sur ${batch.totalPages ?? '?'})`
                  : 'toutes les pages de ce document';

              const extractPrompt = `
Tu dois effectuer un RELEVÉ EXHAUSTIF ET FIDÈLE de cet extrait PDF : "${batch.batchLabel}" (${pageWindow}).
Matière : ${subject} | Classe : ${className} | Chapitre : ${topic}

CONSIGNES IMPÉRATIVES :
1. Lis CHAQUE PAGE de cet extrait du haut en bas (notes manuscrites d'élève, textes de cours, documents du manuel, cartes, encadrés vocabulaire, légendes, tableaux, schémas, marges).
2. Ne résume pas en termes vagues ! Transcris dans "keyFactsAndConcepts" TOUS les faits précis : dates exactes + événement, noms d'acteurs/lieux/cités, définitions complètes, mécanismes, causes/conséquences, chiffres et exemples du manuel (ex: noms de cités, édits, lois, personnages, notions).
3. Utilise des références explicites dans "pageRef" (ex: "${batch.displayName} — p. ${batch.startPage}" ...).
4. Reproduis toutes les formules/données chiffrées dans "formulasAndData", les tableaux dans "tablesFound", et les schémas/organigrammes dans "diagramsFound".
`;
              const resp = await callGeminiJson(
                `1/4 Lecture intégrale (${completedBatches}/${preparedBatches.length} lots)...`,
                [batch.part, { text: extractPrompt }],
                batchInventorySchema,
                ThinkingLevel.HIGH
              );
              const parsed = JSON.parse((resp.text ?? '{"pages":[]}').trim()) as {
                pages?: BatchInventoryLike['pages'];
              };
              completedBatches += 1;
              setStage(
                `1/4 Lecture intégrale (${completedBatches}/${preparedBatches.length}) : ${batch.batchLabel}`
              );
              return {
                batchIndex: batch.batchIndex,
                batchLabel: batch.batchLabel,
                pages: Array.isArray(parsed.pages) ? parsed.pages : [],
              };
            }
          );

          const totalExtractedFacts = batchInventories.reduce(
            (sum, b) =>
              sum + b.pages.reduce((pSum, pg) => pSum + (pg.keyFactsAndConcepts?.length || 0), 0),
            0
          );
          const extractedDiagramNotes = batchInventories.flatMap((b) =>
            b.pages.flatMap((pg) => pg.diagramsFound || [])
          );
          const inventoryText = serializeBatchInventoryForPrompt(batchInventories);

          // =========================================================================
          // STAGE 2 : ADAPTIVE MULTI-CARD COVERAGE PLAN
          // =========================================================================
          const targetCardCount = computeTargetCardCount(
            totalKnownPages,
            totalExtractedFacts,
            cardCount
          );

          const stage2Label = `2/4 Planification exhaustive sur ${targetCardCount} fiche(s) R/V (${totalExtractedFacts} notions relevées)...`;
          setStage(stage2Label);

          const planPrompt = `
Tu dois répartir L'INTÉGRALITÉ du relevé ci-dessous (${totalKnownPages} pages analysées, ${totalExtractedFacts} faits/notions relevés) en EXACTEMENT ${targetCardCount} fiche(s) recto-verso 14 × 19 cm.
Matière : ${subject} | Classe : ${className} | Sujet : ${topic}
Sources : ${sourceNames.join(', ')}

RELEVÉ COMPLET EXTRAIT DES PDF :
---
${inventoryText}
---

RÈGLES STRICTES DE PLANIFICATION :
1. "cardsPlan" DOIT contenir EXACTEMENT ${targetCardCount} élément(s), suivant la progression logique du cours (chronologique ou thématique).
2. Répartis les notions essentielles, dates, acteurs, mécanismes, définitions et exemples clés dans "assignedFactsVerbatim" sans surcharger une seule fiche (vise un équilibre naturel entre les fiches).
3. Indique dans "assignedBatchIndices" les numéros de lots (0-based, entre 0 et ${Math.max(0, preparedBatches.length - 1)}) correspondant à chaque fiche.
4. Précise un plan structuré et aéré pour "rectoOutline" (parties I. et II.) et "versoOutline" (parties III. et IV. À retenir / Vocabulaire / Schéma / Tableau) visant **88 à 95 %** de remplissage par face (jamais de vide en bas de page ni de dépassement).
5. Active "shouldIncludeDiagram": true sur les fiches où un mécanisme, axe littéraire ou organigramme clé figure dans les sources, et "shouldIncludeTable": true dès qu'un tableau comparatif ou chronologique synthétique (3 colonnes, 3–5 lignes) clarifie des œuvres, auteurs, périodes ou notions.
`;
          const planResp = await callGeminiJson(
            stage2Label,
            [{ text: planPrompt }],
            coveragePlanSchema,
            ThinkingLevel.MEDIUM
          );
          const planData = JSON.parse((planResp.text ?? '{"cardsPlan":[]}').trim()) as {
            deckTitle?: string;
            keyVisualSchemas?: string[];
            verificationNotes?: string;
            cardsPlan?: Array<{
              title?: string;
              generatedPrompt?: string;
              assignedBatchIndices?: number[];
              focusTopics?: string[];
              rectoOutline?: string;
              versoOutline?: string;
              assignedFactsVerbatim?: string[];
              shouldIncludeDiagram?: boolean;
              diagramDescription?: string;
              shouldIncludeTable?: boolean;
            }>;
          };

          let cardsPlan = Array.isArray(planData.cardsPlan) ? planData.cardsPlan.slice(0, targetCardCount) : [];
          while (cardsPlan.length < targetCardCount) {
            const idx = cardsPlan.length;
            const fallbackBatchIdx = Math.min(preparedBatches.length - 1, idx);
            cardsPlan.push({
              title: `${topic} — Partie ${idx + 1}`,
              generatedPrompt: `Rédige la fiche ${idx + 1} sur ${topic}.`,
              assignedBatchIndices: fallbackBatchIdx >= 0 ? [fallbackBatchIdx] : [],
              focusTopics: [topic],
              rectoOutline: 'I. Notions et contexte | II. Mécanismes et faits majeurs',
              versoOutline: 'III. Approfondissement et exemples | IV. Vocabulaire / Schéma-bilan',
              assignedFactsVerbatim: [],
              shouldIncludeDiagram: false,
            });
          }

          // Guard against dropped facts: attach any missed fact lines evenly across cards
          const uncoveredFacts = collectUncoveredFactLines(
            batchInventories,
            cardsPlan.map((c) => c.assignedFactsVerbatim || [])
          );
          if (uncoveredFacts.length > 0 && cardsPlan.length > 0) {
            uncoveredFacts.forEach((factLine, fIdx) => {
              const target = cardsPlan[fIdx % cardsPlan.length];
              target.assignedFactsVerbatim = [...(target.assignedFactsVerbatim || []), factLine];
            });
          }

          // =========================================================================
          // STAGE 3 : DEEP CARD-BY-CARD AUTHORING (MAX DENSITY + ZERO OMISSION)
          // =========================================================================
          interface RawGeneratedCard {
            title: string;
            generatedPrompt: string;
            leftSide: { sections: Record<string, unknown>[] };
            rightSide: { sections: Record<string, unknown>[] };
          }

          let authoredCount = 0;
          const stage3BaseLabel = `3/4 Rédaction approfondie des fiches (0/${cardsPlan.length})...`;
          setStage(stage3BaseLabel);

          const rawCards = await runWithConcurrency(cardsPlan, 2, async (cPlan, idx) => {
            const relevantIndices = selectRelevantBatchIndices(
              cPlan.assignedBatchIndices || [],
              preparedBatches.length,
              3
            );
            const relevantPdfParts = relevantIndices.map((bi) => preparedBatches[bi].part);
            const relevantBatchesText = serializeBatchInventoryForPrompt(
              relevantIndices.map((bi) => batchInventories[bi]).filter(Boolean)
            );
            const assignedFactsText = (cPlan.assignedFactsVerbatim || [])
              .map((f, fi) => `${fi + 1}. ${f}`)
              .join('\n');

            const cardPrompt = `
Rédige UNIQUEMENT la FICHE N°${idx + 1}/${cardsPlan.length} : "${cPlan.title || topic}" (format 14 × 19 cm Recto + Verso).
Tu disposes des extraits PDF sources correspondants ET de l'intégralité des faits assignés à cette fiche.

MÉTA-PROMPT DE L'ÉLÈVE :
---
${metaPrompt}
---
PARAMÈTRES :
- Classe : ${className} | Matière : ${subject} | Chapitre : ${topic}
${extraInstructions ? `- Consignes complémentaires : ${extraInstructions}` : ''}

PLAN ASSIGNÉ POUR CETTE FICHE :
- Sujets ciblés : ${(cPlan.focusTopics || []).join(' ; ')}
- Plan RECTO (leftSide) : ${cPlan.rectoOutline || 'Parties I. et II.'}
- Plan VERSO (rightSide) : ${cPlan.versoOutline || 'Parties III. et IV.'}
${cPlan.shouldIncludeDiagram ? `- SCHÉMA VECTORIEL REQUIS ("diagram") : ${cPlan.diagramDescription || 'Schéma de synthèse clair avec 4 à 7 nœuds et flèches.'}` : ''}
${cPlan.shouldIncludeTable ? '- TABLEAU REQUIS ("table") : Inclus un tableau comparatif ou chronologique synthétique.' : ''}

FAITS, DATES, ACTEURS, DÉFINITIONS ET EXEMPLES À INTÉGRER À 100 % (ZÉRO OUBLI) :
${assignedFactsText || relevantBatchesText}

RELEVÉ DÉTAILLÉ DES LOTS SOURCES :
${relevantBatchesText}

EXIGENCES STRICTES DE SYNTHÈSE AÉRÉE ET DE PLEINE PAGE (14 × 19 CM) :
1. **SYNTHÈSE HAUT RENDEMENT — PLEINE PAGE (88–95 % PAR FACE, ZÉRO VIDE EN BAS ET ZÉRO DÉPASSEMENT)** :
   - Interdiction absolue de laisser un tiers ou un quart de page vide en bas ! Développe chaque notion clé avec ses exemples, citations brèves, procédés, dates et enjeux précis pour occuper tout l'espace utile.
   - Interdiction aussi de coller des pavés bruts de 5–8 lignes par puce : **synthétise** chaque idée en puces nettes de **1 à 3 lignes maximum** (max ~170–230 caractères par puce). Quand un thème comporte plusieurs détails, décompose-le en 1 amorce level 1 courte + 2–3 sous-puces level 2 concises.
   - **RECTO (leftSide)** : vise **1 950 à 2 350 caractères** sans schéma (ou **1 300 à 1 650 car.** si un schéma ou tableau figure sur le Recto).
   - **VERSO (rightSide)** : vise **2 000 à 2 450 caractères** sans schéma/tableau (ou **1 350 à 1 700 car.** si un schéma ou tableau figure sur le Verso).
   - NE DÉBORDE JAMAIS de la page 14 × 19 cm !
2. **STRUCTURE** : Numérote toujours avec un point : "I.", "II." sur le Recto ; "III.", "IV." sur le Verso (ou "1.", "2.", "3.", "4." avec "isSubHeader": true). Termine souvent le Verso par un bloc "vocabList" (4–5 termes concis), "table" (3 colonnes, 3–5 lignes comparant œuvres/auteurs/notions/repères) ou "diagram". En Français/Histoire, un court "table" comparatif ou "diagram" structurant enrichit fortement la fiche.
3. **TYPOGRAPHIE & SURLIGNAGE FIDÈLES** :
   - Utilise __Amorce :__ pour souligner le titre court de chaque puce avant les deux points (ex: "__Rousseau, Les Confessions (1782) :__ 1re autobiographie moderne..."). Évite d'imbriquer des astérisques *...* à l'intérieur de __...__ (place les titres d'œuvres en *italique* juste après le titre souligné, ou simplement en texte souligné propre).
   - INTERDIT de ne mettre en [rouge] que des chiffres ou dates isolés (évite "[rouge]-509[/rouge]"). Mets en [rouge]...[/rouge] les **notions, définitions, procédés, causes/effets ou événements datés clés** (3 à 8 mots par bloc rouge, 1 max par puce).
   - Mets les acteurs, auteurs, lieux et notions secondaires en **gras**.
4. **SCHÉMA VECTORIEL COMPACT ("diagram")** : Privilégie un schéma **équilibré et peu haut** (2 colonnes parallèles ou 3 paliers horizontaux max, 4 à 6 "nodes", x entre 22 et 78, y entre 12 et 88, libellé <= 24 car., sous-libellé <= 24 car.), au moins 2 "edges", et "groups" si deux compartiments existent. JAMAIS "nodes": [].
5. **TABLEAU SYNTHÉTIQUE ("table")** : Si un tableau est inclus, garde 3 colonnes max, 3 à 5 lignes max, avec des repères courts en 1re/2e colonne (ex: "Rousseau (1782)") et des synthèses brèves en dernière colonne.
`;
            const cardResp = await callGeminiJson(
              `3/4 Rédaction fiche ${idx + 1}/${cardsPlan.length}...`,
              [...relevantPdfParts, { text: cardPrompt }],
              singleCardSchema,
              ThinkingLevel.HIGH
            );
            const parsedCard = JSON.parse((cardResp.text ?? '{}').trim()) as RawGeneratedCard;
            authoredCount += 1;
            setStage(
              `3/4 Rédaction approfondie terminée (${authoredCount}/${cardsPlan.length})...`
            );
            return parsedCard;
          });

          // =========================================================================
          // STAGE 4 : FULL-PAGE DENSITY AUDIT & TARGETED AUTO-EXPANSION
          // =========================================================================
          setStage('4/4 Audit de densité pleine page & complétude...');

          const sanitizeSideSections = (
            rawSecs: Record<string, unknown>[] | undefined,
            prefix: string,
            cardIdx: number
          ) =>
            (rawSecs || []).map((s, sIdx) => ({
              id: typeof s.id === 'string' && s.id ? s.id : `${prefix}-s-${cardIdx}-${sIdx}`,
              romanNumeral: normalizeRomanNumeral(String(s.romanNumeral || `${sIdx + 1}.`)),
              title: String(s.title || 'Section'),
              isSubHeader: Boolean(s.isSubHeader),
              blocks: sanitizeGeneratedBlocks(
                Array.isArray(s.blocks) ? (s.blocks as Record<string, unknown>[]) : [],
                `${prefix}-${cardIdx}-${sIdx}`
              ),
            }));

          const expandedRawCards = await runWithConcurrency(rawCards, 2, async (rawCard, idx) => {
            const leftClean = { sections: sanitizeSideSections(rawCard.leftSide?.sections, 'l', idx) };
            const rightClean = { sections: sanitizeSideSections(rawCard.rightSide?.sections, 'r', idx) };
            const leftD = estimateSideDensity(leftClean, 9.2, 1.35, 'recto');
            const rightD = estimateSideDensity(rightClean, 9.2, 1.35, 'verso');

            const hasOverflow = leftD.utilizationPercent > 97 || rightD.utilizationPercent > 97;
            const hasUnderfill = leftD.utilizationPercent < 86 || rightD.utilizationPercent < 86;

            if (!hasOverflow && !hasUnderfill) {
              return rawCard;
            }

            try {
              const cPlan = cardsPlan[idx];
              const relevantIndices = selectRelevantBatchIndices(
                cPlan?.assignedBatchIndices || [],
                preparedBatches.length,
                2
              );
              const relevantBatchesText = serializeBatchInventoryForPrompt(
                relevantIndices.map((bi) => batchInventories[bi]).filter(Boolean)
              );

              if (hasOverflow) {
                setStage(
                  `4/4 Aération & équilibrage anti-dépassement fiche ${idx + 1}/${rawCards.length} (R: ${leftD.utilizationPercent}%, V: ${rightD.utilizationPercent}%)...`
                );
                const condensePrompt = `
Cette fiche 14 × 19 cm DÉBORDE ou est TROP SURCHARGÉE / COLLÉE :
- RECTO actuel (leftSide) : ${leftD.utilizationPercent}% (${leftD.estimatedChars} caractères) — CIBLE IMPÉRATIVE : **88% à 94%** (<= 96%).
- VERSO actuel (rightSide) : ${rightD.utilizationPercent}% (${rightD.estimatedChars} caractères) — CIBLE IMPÉRATIVE : **88% à 94%** (<= 96%).

MISSION DE SYNTHÈSE AÉRÉE :
1. Garde 100 % des notions essentielles, dates, acteurs, formules, tableaux et schémas importants.
2. Remplace les longs pavés de prose (4–8 lignes) par des **puces synthétiques claires et respirantes de 1 à 3 lignes max** (supprime les redites, périphrases et énumérations accessoires sans intérêt).
3. Rééquilibre au besoin les sections entre Recto (leftSide) et Verso (rightSide) pour que AUCUNE face ne dépasse 96 % et qu'aucun titre ne soit coupé en bas de page.
4. Si un schéma est très vertical ou verbeux, garde ses libellés courts (<= 22 car.) et 4–6 nœuds max.

FICHE ACTUELLE À AÉRER (JSON) :
${JSON.stringify(rawCard)}
`;
                const condResp = await callGeminiJson(
                  `4/4 Aération fiche ${idx + 1}/${rawCards.length}...`,
                  [{ text: condensePrompt }],
                  singleCardSchema,
                  ThinkingLevel.MEDIUM
                );
                const condensed = JSON.parse((condResp.text ?? '{}').trim()) as RawGeneratedCard;
                if (condensed.leftSide?.sections?.length && condensed.rightSide?.sections?.length) {
                  return condensed;
                }
                return rawCard;
              }

              setStage(
                `4/4 Équilibrage fiche ${idx + 1}/${rawCards.length} (R: ${leftD.utilizationPercent}%, V: ${rightD.utilizationPercent}%)...`
              );
              const expandPrompt = `
Cette fiche 14 × 19 cm laisse du vide en bas d'au moins une face :
- RECTO actuel (leftSide) : ${leftD.utilizationPercent}% (${leftD.estimatedChars} caractères) — OBJECTIF : **89% à 95%** (STRICTEMENT <= 96%, zéro vide en bas de page !).
- VERSO actuel (rightSide) : ${rightD.utilizationPercent}% (${rightD.estimatedChars} caractères) — OBJECTIF : **89% à 95%** (STRICTEMENT <= 96%, zéro vide en bas de page !).

MISSION : Conserve tout le contenu déjà rédigé et enrichis UNIQUEMENT le côté < 88% en y ajoutant des exemples/citations clés, des sous-puces analytiques courtes (1–3 lignes max par puce), des définitions ("vocabList"), ou un bref tableau récapitulatif ("table" 3 colonnes, 3–4 lignes) / schéma compact tirés des sources ci-dessous, pour remplir la page 14 × 19 cm sans jamais dépasser 96 %.

FICHE ACTUELLE (JSON) :
${JSON.stringify(rawCard)}

FAITS ET SOURCES DISPONIBLES :
${(cPlan?.assignedFactsVerbatim || []).join('\n')}

EXTRAITS DU RELEVÉ :
${relevantBatchesText}
`;
              const expResp = await callGeminiJson(
                `4/4 Équilibrage fiche ${idx + 1}/${rawCards.length}...`,
                [{ text: expandPrompt }],
                singleCardSchema,
                ThinkingLevel.MEDIUM
              );
              const expanded = JSON.parse((expResp.text ?? '{}').trim()) as RawGeneratedCard;
              if (expanded.leftSide?.sections?.length && expanded.rightSide?.sections?.length) {
                return expanded;
              }
            } catch (expErr) {
              console.warn(
                `[/api/generate-fiches job ${jobId}] Stage 4 balance skipped for card ${idx + 1}:`,
                expErr
              );
            }
            return rawCard;
          });

          const plannedPrompts: PlannedPrompt[] = expandedRawCards.map((c, idx) => ({
            title: c.title || cardsPlan[idx]?.title || `${topic} (${idx + 1})`,
            promptText:
              c.generatedPrompt ||
              cardsPlan[idx]?.generatedPrompt ||
              `Rédige une fiche synthétique sur ${c.title || topic}.`,
          }));

          // Pass 4b (text-grounded): synthesize nodes/edges/groups if any diagram came back empty
          const diagramRequests: Array<{
            targetKey: string;
            cardIdx: number;
            side: 'leftSide' | 'rightSide';
            secIdx: number;
            blkIdx: number;
            title: string;
            contextTitle: string;
          }> = [];
          let totalPopulatedDiagrams = 0;

          expandedRawCards.forEach((c, cIdx) => {
            (['leftSide', 'rightSide'] as const).forEach((sideKey) => {
              const secs = c[sideKey]?.sections || [];
              secs.forEach((sec, sIdx) => {
                const blks = Array.isArray(sec.blocks) ? (sec.blocks as Record<string, unknown>[]) : [];
                blks.forEach((blk, bIdx) => {
                  if (blk?.type === 'diagram') {
                    const nodeCount = Array.isArray(blk.nodes) ? blk.nodes.length : 0;
                    if (nodeCount > 0) {
                      totalPopulatedDiagrams += 1;
                    } else {
                      diagramRequests.push({
                        targetKey: `${cIdx}-${sideKey}-${sIdx}-${bIdx}`,
                        cardIdx: cIdx,
                        side: sideKey,
                        secIdx: sIdx,
                        blkIdx: bIdx,
                        title:
                          typeof blk.title === 'string' && blk.title.trim()
                            ? blk.title.trim()
                            : String(sec.title || c.title || topic),
                        contextTitle: String(c.title || topic),
                      });
                    }
                  }
                });
              });
            });
          });

          const keyVisualSchemas = Array.isArray(planData.keyVisualSchemas)
            ? planData.keyVisualSchemas.filter((s) => typeof s === 'string' && s.trim())
            : [];

          if (
            diagramRequests.length === 0 &&
            totalPopulatedDiagrams === 0 &&
            (keyVisualSchemas.length > 0 || extractedDiagramNotes.length > 0) &&
            expandedRawCards.length > 0
          ) {
            const firstCard = expandedRawCards[0];
            const targetSide =
              (firstCard.rightSide?.sections?.length ?? 0) > 0 ? 'rightSide' : 'leftSide';
            const secs = firstCard[targetSide]?.sections || [];
            if (secs.length > 0) {
              const secIdx = secs.length - 1;
              const blks = Array.isArray(secs[secIdx].blocks)
                ? (secs[secIdx].blocks as Record<string, unknown>[])
                : [];
              const diagTitle = keyVisualSchemas[0] || extractedDiagramNotes[0];
              blks.push({ type: 'diagram', title: diagTitle, nodes: [], edges: [] });
              secs[secIdx].blocks = blks;
              diagramRequests.push({
                targetKey: `0-${targetSide}-${secIdx}-${blks.length - 1}`,
                cardIdx: 0,
                side: targetSide,
                secIdx,
                blkIdx: blks.length - 1,
                title: diagTitle,
                contextTitle: String(firstCard.title || topic),
              });
            }
          }

          if (diagramRequests.length > 0) {
            try {
              setStage('4/4 Finalisation des schémas vectoriels...');
              const repairPrompt = `
À partir uniquement des notions vérifiées du cours ci-dessous, construis les schémas vectoriels manquants demandés.
NOTIONS ET SCHÉMAS EXTRAITS DU COURS :
${inventoryText || topic}

RÈGLES DE CONSTRUCTION :
- Chaque schéma DOIT être **large et compact** : 4 à 6 "nodes" max et au moins 2 "edges" utilisant les "id" exacts des nodes.
- Coordonnées sur une grille horizontale ou en 2 colonnes équilibrées : x entre 24 et 76, y entre 14 et 86, width entre 30 et 44.
- Ajoute "groups" si deux colonnes parallèles / compartiments existent.
- tone autorisés : "blue", "amber", "green", "red", "slate".
- Libellés très concis (<= 24 caractères).

Schémas à générer :
${diagramRequests
  .map((r) => `- targetKey: "${r.targetKey}" | Fiche: "${r.contextTitle}" | Titre schéma: "${r.title}"`)
  .join('\n')}
`;
              const repairResp = await callGeminiJson(
                '4/4 Finalisation des schémas vectoriels...',
                [{ text: repairPrompt }],
                diagramRepairSchema,
                ThinkingLevel.LOW
              );
              const repaired = JSON.parse((repairResp.text ?? '{"diagrams":[]}').trim()) as {
                diagrams?: Array<{
                  targetKey: string;
                  title: string;
                  footnote?: string;
                  nodes: unknown[];
                  edges: unknown[];
                  groups?: unknown[];
                }>;
              };
              const byKey = new Map(
                (repaired.diagrams || []).map((d) => [d.targetKey, d] as const)
              );
              for (const reqInfo of diagramRequests) {
                const match = byKey.get(reqInfo.targetKey);
                if (match && Array.isArray(match.nodes) && match.nodes.length > 0) {
                  const secObj = expandedRawCards[reqInfo.cardIdx]?.[reqInfo.side]?.sections?.[
                    reqInfo.secIdx
                  ];
                  const secBlocks = Array.isArray(secObj?.blocks)
                    ? (secObj.blocks as Record<string, unknown>[])
                    : undefined;
                  const targetBlk = secBlocks?.[reqInfo.blkIdx];
                  if (targetBlk) {
                    targetBlk.title = match.title || reqInfo.title;
                    targetBlk.nodes = match.nodes;
                    targetBlk.edges = Array.isArray(match.edges) ? match.edges : [];
                    if (Array.isArray(match.groups) && match.groups.length > 0) {
                      targetBlk.groups = match.groups;
                    }
                    if (match.footnote) targetBlk.footnote = match.footnote;
                  }
                }
              }
            } catch (diagErr) {
              console.warn('[/api/generate-fiches] Diagram enrichment skipped:', diagErr);
            }
          }

          const palette = SUBJECT_PALETTES[subject];
          const nowIso = new Date().toISOString();

          const cards: FicheCard[] = expandedRawCards.map((c, idx) => {
            const rawCard: FicheCard = {
              id: `card-${Date.now()}-${idx}`,
              index: idx + 1,
              className,
              subject,
              dateLabel,
              title: c.title || plannedPrompts[idx]?.title || topic,
              generatedPrompt: c.generatedPrompt || plannedPrompts[idx]?.promptText,
              backgroundHex: palette.backgroundHex,
              visualStyle,
              fontSizePt: 9.2,
              lineHeight: 1.35,
              autoFillHeight: true,
              leftSide: {
                sections: sanitizeSideSections(c.leftSide?.sections, 'l', idx),
              },
              rightSide: {
                sections: sanitizeSideSections(c.rightSide?.sections, 'r', idx),
              },
            };
            return rebalanceCardLayout(rawCard);
          });

          if (cards.length === 0) {
            job.status = 'error';
            job.error =
              "L'IA n'a pas pu extraire de fiches structurées depuis ces PDF. Vérifiez la lisibilité du scan.";
            job.updatedAt = Date.now();
            return;
          }

          const extractedSections = batchInventories.flatMap((b) =>
            b.pages.map(
              (pg) =>
                `${pg.pageRef}: ${(pg.headings || []).join(' · ') || `${pg.keyFactsAndConcepts.length} notions`}`
            )
          );

          const deck: FicheDeck = {
            id: `deck-${Date.now()}`,
            title: planData.deckTitle || cards[0].title,
            className,
            subject,
            dateLabel,
            sourceFileNames: sourceNames,
            metaPromptName,
            cards,
            verification: {
              sourcesAnalyzed: sourceNames,
              extractedSections,
              notes:
                planData.verificationNotes ||
                `${totalKnownPages} pages analysées par lots de 5 pages (${totalExtractedFacts} notions extraites sur ${cards.length} fiche(s) R/V).`,
            },
            createdAt: nowIso,
            updatedAt: nowIso,
          };

          await upsertStudioDeck(deck);

          job.plannedPrompts = plannedPrompts;
          job.deck = deck;
          job.status = 'done';
          job.stageMessage = 'Fiches prêtes et vérifiées !';
          job.updatedAt = Date.now();
        } catch (err: unknown) {
          const rawMessage =
            err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.';
          console.error(`[/api/generate-fiches job ${jobId}] Error:`, rawMessage);
          job.status = 'error';
          job.error = formatUserFriendlyError(err);
          job.updatedAt = Date.now();
        } finally {
          for (const cacheId of consumedLocalCacheIds) {
            uploadedPdfBufferCache.delete(cacheId);
          }
          if (geminiFileNamesToCleanup.length > 0) {
            await Promise.allSettled(
              geminiFileNamesToCleanup.map((name) => ai.files.delete({ name }))
            );
          }
        }
      })();

      res.status(202).json({
        jobId: job.id,
        status: job.status,
        stageMessage: job.stageMessage,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.';
      console.error('[/api/generate-fiches] Error:', message);
      const status =
        message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')
          ? 403
          : message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : 500;
      res.status(status).json({ error: message });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Point d’accès API introuvable.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FicheStudio server listening on http://localhost:${PORT}`);
  });
  httpServer.requestTimeout = 300_000;
  httpServer.keepAliveTimeout = 65_000;
}

startServer();
