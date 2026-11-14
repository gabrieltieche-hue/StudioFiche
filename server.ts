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
  markupToSpans,
  rebalanceCardLayout,
  sanitizeDiagramData,
  SUBJECT_PALETTES,
} from './src/utils/ficheLogic';
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
        'OBLIGATOIRE et NON VIDE (3 à 6 objets) si type==="diagram" : nœuds du schéma vectoriel.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Identifiant court unique, ex: n1, n2, n3' },
          label: { type: Type.STRING, description: 'Libellé court <= 26 caractères' },
          sublabel: { type: Type.STRING, description: 'Sous-titre court optionnel <= 26 caractères' },
          x: { type: Type.NUMBER, description: 'Coordonnée horizontale entre 18 et 82' },
          y: { type: Type.NUMBER, description: 'Coordonnée verticale entre 16 et 84' },
          width: { type: Type.NUMBER, description: 'Largeur en % entre 26 et 44' },
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
        },
        required: ['targetKey', 'title', 'nodes', 'edges'],
      },
    },
  },
  required: ['diagrams'],
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

const cardsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    extractedSections: {
      type: Type.ARRAY,
      description:
        'Inventaire exhaustif page par page (PDF 1 p.1, PDF 1 p.2, etc.) de tous les chapitres, sous-titres manuscrits, dates, formules, définitions, tableaux et documents trouvés dans les PDF.',
      items: { type: Type.STRING },
    },
    keyVisualSchemas: {
      type: Type.ARRAY,
      description:
        'Mécanismes, organisations institutionnelles, chronologies ou tableaux repérés dans les PDF.',
      items: { type: Type.STRING },
    },
    deckTitle: { type: Type.STRING },
    verificationNotes: {
      type: Type.STRING,
      description:
        'Court bilan de vérification confirmant quelles sources/pages ont été couvertes et s’il y avait des passages manuscrits difficiles à lire.',
    },
    cards: {
      type: Type.ARRAY,
      items: {
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
      },
    },
  },
  required: ['extractedSections', 'deckTitle', 'verificationNotes', 'cards'],
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

const generationJobs = new Map<string, GenerationJob>();
const chunkUploadSessions = new Map<string, ChunkUploadSession>();
const JOB_TTL_MS = 15 * 60 * 1000;

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
}, 2 * 60 * 1000).unref();

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
      const uploaded = await uploadBufferToGeminiFiles(ai, file.buffer, file.originalname);
      res.json({
        ...uploaded,
        displayName: ensurePdfFilename(file.originalname),
        size: file.size,
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
      res.json({
        ...uploaded,
        displayName: session.displayName,
        size: fullBuffer.length,
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
      let preUploadedFiles: Array<{ uri: string; name?: string; mimeType?: string; displayName?: string }> = [];
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

      // Copy buffers safely so background job is decoupled from HTTP request lifecycle
      const bufferedFiles = files.map((f) => ({
        originalname: f.originalname,
        size: f.size,
        buffer: Buffer.from(f.buffer),
      }));

      const jobId = crypto.randomUUID();
      const nowMs = Date.now();
      const job: GenerationJob = {
        id: jobId,
        status: 'running',
        stageMessage: '1/2 Préparation et lecture des sources PDF...',
        startedAt: nowMs,
        updatedAt: nowMs,
      };
      generationJobs.set(jobId, job);

      // Run Gemini pipeline asynchronously so Cloud Run / mobile connections never drop
      void (async () => {
        const geminiFileNamesToCleanup: string[] = preUploadedFiles
          .map((pf) => pf.name)
          .filter((n): n is string => Boolean(n));

        const setStage = (msg: string) => {
          job.stageMessage = msg;
          job.updatedAt = Date.now();
        };

        try {
          const totalMultipartBytes = bufferedFiles.reduce((sum, f) => sum + f.size, 0);
          const useFilesApiForMultipart = totalMultipartBytes > 8 * 1024 * 1024;

          if (useFilesApiForMultipart && bufferedFiles.length > 0) {
            setStage('Envoi des PDF vers le lecteur haute capacité...');
          }

          const multipartParts = useFilesApiForMultipart
            ? await Promise.all(
                bufferedFiles.map(async (file) => {
                  const uploaded = await uploadBufferToGeminiFiles(
                    ai,
                    file.buffer,
                    file.originalname
                  );
                  geminiFileNamesToCleanup.push(uploaded.name);
                  return {
                    fileData: {
                      fileUri: uploaded.uri,
                      mimeType: 'application/pdf',
                    },
                  };
                })
              )
            : bufferedFiles.map((file) => ({
                inlineData: {
                  mimeType: 'application/pdf',
                  data: file.buffer.toString('base64'),
                },
              }));

          const preUploadedParts = preUploadedFiles.map((pf) => ({
            fileData: {
              fileUri: pf.uri,
              mimeType: pf.mimeType || 'application/pdf',
            },
          }));

          const pdfParts = [...preUploadedParts, ...multipartParts];

          const generateWithRetry = async (
            stageLabel: string,
            promptText: string,
            schema: Record<string, unknown>,
            thinkingLevel: ThinkingLevel,
            includePdfs = true
          ) => {
            const attempts: Array<{ model: string; waitMs: number; useThinking: boolean }> = [
              { model: 'gemini-4-hydrogen', waitMs: 4000, useThinking: true },
              { model: 'gemini-4-hydrogen', waitMs: 2500, useThinking: true },
              { model: 'gemini-3.1-flash-lite', waitMs: 0, useThinking: false },
            ];
            let lastErr: unknown;
            for (let i = 0; i < attempts.length; i += 1) {
              const cfg = attempts[i];
              try {
                return await ai.models.generateContent({
                  model: cfg.model,
                  contents: {
                    parts: includePdfs ? [...pdfParts, { text: promptText }] : [{ text: promptText }],
                  },
                  config: {
                    ...(cfg.useThinking ? { thinkingConfig: { thinkingLevel } } : {}),
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                  },
                });
              } catch (genErr) {
                lastErr = genErr;
                console.warn(
                  `[/api/generate-fiches] Attempt ${i + 1} (${cfg.model}) failed:`,
                  genErr instanceof Error ? genErr.message : String(genErr)
                );
                if (i < attempts.length - 1 && isTransientGeminiError(genErr)) {
                  setStage(
                    i === attempts.length - 2
                      ? 'Basculement vers le moteur haute disponibilité...'
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

          const mainStageLabel = '1/2 Analyse page par page des PDF & rédaction des fiches...';
          setStage(mainStageLabel);

          const unifiedPrompt = `
Agis en tant que professeur expert en ${subject} pour une classe de ${className} et applique la méthode NotebookLM.
Tu dois analyser INTÉGRALEMENT tous les documents PDF joints (cours scanné manuscrit ou tapé ET manuel éventuel), de la PREMIÈRE à la DERNIÈRE page.
RÈGLE D'OR ABSOLUE : Utilise EXCLUSIVEMENT les informations réellement présentes dans les PDF. N'invente aucune notion absente des sources.

MÉTA-PROMPT DE L'ÉLÈVE :
---
${metaPrompt}
---
PARAMÈTRES :
- Classe : ${className}
- Matière : ${subject}
- Sujet / Chapitre : ${topic}
- Nombre de fiches souhaité : ${
            cardCount === 'auto'
              ? 'Automatique et complet : si le cours + manuel couvre plusieurs séances/thèmes (4+ grandes notions), génère 2 ou 3 fiches pour couvrir 100 % du contenu sans rien sacrifier ; 1 seule fiche uniquement si le document est très court.'
              : `${cardCount} fiche(s) exactement`
          }
${extraInstructions ? `- Consignes complémentaires : ${extraInstructions}` : ''}

PROCÉDURE OBLIGATOIRE DANS LE JSON :
1. D'abord, remplis "extractedSections" : dresse l'inventaire COMPLET page par page (ex: "PDF 1 - Page 1 : ...") de chaque titre, notion, date, formule, tableau et passage manuscrit présent dans les PDF.
2. Ensuite, remplis "keyVisualSchemas" : liste les mécanismes, organisations institutionnelles, chronologies ou comparaisons qui méritent un schéma vectoriel ou un tableau.
3. Ensuite, rédige "cards" en vérifiant que 100 % de "extractedSections" est couvert dans les fiches :
   - Chaque fiche comporte 2 côtés 14 × 19 cm : leftSide = RECTO (~50 % du contenu, parties I et II) et rightSide = VERSO (~50 % du contenu, parties III et IV / À retenir / Schéma ou Tableau).
   - Environ 1100 à 1450 caractères par côté, phrases denses, précises et mémorisables.
   - Balisage dans "text" :
     * [rouge]mot-clé, date, formule ou notion cruciale[/rouge]
     * __Amorce :__ pour souligner le titre d'une puce (évite de mettre [rouge]...[/rouge] à l'intérieur de __...__, écris plutôt __Amorce :__ [rouge]date/mot[/rouge]).
     * **gras** ou *italique* si utile.
   - RÈGLE OBLIGATOIRE POUR LES SCHÉMAS VECTORIELS ("diagram") :
     Dès qu'un thème comporte un mécanisme, des institutions politiques, une chaîne cause → conséquence ou une chronologie, inclus un bloc "diagram" COMPLET avec 3 à 6 "nodes" et au moins 2 "edges".
     INTERDIT ABSOLU de renvoyer "nodes": [] dans un bloc "diagram" !
     Exemple EXACT :
     {"type":"diagram","title":"Institutions de la République","nodes":[{"id":"n1","label":"Citoyens (Comices)","sublabel":"Votent lois et élisent","x":50,"y":18,"width":40,"tone":"blue"},{"id":"n2","label":"Consuls & Magistrats","sublabel":"Exécutif (1 an, veto)","x":28,"y":55,"width":38,"tone":"amber"},{"id":"n3","label":"Sénat","sublabel":"Conseil à vie","x":72,"y":55,"width":34,"tone":"red"}],"edges":[{"from":"n1","to":"n2","label":"élisent"},{"from":"n3","to":"n2","label":"conseille","dashed":true}]}
     "tone" doit être EXCLUSIVEMENT : "blue", "amber", "green", "red", "slate".
4. Dans "verificationNotes", résume quelles pages/sources ont été vérifiées et signale tout passage manuscrit flou éventuel.
`;

          const cardsResponse = await generateWithRetry(
            mainStageLabel,
            unifiedPrompt,
            cardsResponseSchema,
            ThinkingLevel.LOW,
            true
          );

          setStage('2/2 Vérification des schémas & équilibrage 14 × 19 cm...');

          let cardsData: {
            extractedSections?: string[];
            keyVisualSchemas?: string[];
            deckTitle?: string;
            verificationNotes?: string;
            cards: {
              title: string;
              generatedPrompt: string;
              leftSide: { sections: Record<string, unknown>[] };
              rightSide: { sections: Record<string, unknown>[] };
            }[];
          };
          try {
            cardsData = JSON.parse((cardsResponse.text ?? '{"cards":[]}').trim());
          } catch (parseErr) {
            const finishReason = cardsResponse.candidates?.[0]?.finishReason;
            console.error(
              `[/api/generate-fiches job ${jobId}] JSON parse error (finishReason=${finishReason}):`,
              parseErr
            );
            throw new Error(
              finishReason === 'MAX_TOKENS'
                ? 'La synthèse générée était trop longue pour tenir dans la réponse. Essayez en sélectionnant « 1 » ou « 2 » fiches.'
                : 'Le modèle a renvoyé une structure incomplète. Réessayez ou réduisez le nombre de fiches.'
            );
          }

          const extractedSections = Array.isArray(cardsData.extractedSections)
            ? cardsData.extractedSections.filter((s) => typeof s === 'string' && s.trim())
            : [];
          const keyVisualSchemas = Array.isArray(cardsData.keyVisualSchemas)
            ? cardsData.keyVisualSchemas.filter((s) => typeof s === 'string' && s.trim())
            : [];
          const plannedPrompts: PlannedPrompt[] = (cardsData.cards || []).map((c, idx) => ({
            title: c.title || `${topic} (${idx + 1})`,
            promptText: c.generatedPrompt || `Rédige une fiche synthétique sur ${c.title || topic}.`,
          }));

          // Pass 2.5 (lightweight text-grounded): synthesize nodes/edges if any diagram came back empty
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

          (cardsData.cards || []).forEach((c, cIdx) => {
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

          if (
            diagramRequests.length === 0 &&
            totalPopulatedDiagrams === 0 &&
            keyVisualSchemas.length > 0 &&
            (cardsData.cards || []).length > 0
          ) {
            const firstCard = cardsData.cards[0];
            const targetSide =
              (firstCard.rightSide?.sections?.length ?? 0) > 0 ? 'rightSide' : 'leftSide';
            const secs = firstCard[targetSide]?.sections || [];
            if (secs.length > 0) {
              const secIdx = secs.length - 1;
              const blks = Array.isArray(secs[secIdx].blocks)
                ? (secs[secIdx].blocks as Record<string, unknown>[])
                : [];
              const newBlk = { type: 'diagram', title: keyVisualSchemas[0], nodes: [], edges: [] };
              blks.push(newBlk);
              secs[secIdx].blocks = blks;
              diagramRequests.push({
                targetKey: `0-${targetSide}-${secIdx}-${blks.length - 1}`,
                cardIdx: 0,
                side: targetSide,
                secIdx,
                blkIdx: blks.length - 1,
                title: keyVisualSchemas[0],
                contextTitle: String(firstCard.title || topic),
              });
            }
          }

          if (diagramRequests.length > 0) {
            try {
              setStage('2/2 Génération dédiée des schémas vectoriels...');
              const repairPrompt = `
À partir uniquement des notions vérifiées du cours ci-dessous, construis les schémas vectoriels manquants demandés.
NOTIONS VÉRIFIÉES DU COURS :
${extractedSections.join('\n') || topic}

Chaque schéma DOIT avoir entre 3 et 6 "nodes" non vides et au moins 2 "edges" utilisant les "id" exacts des nodes.
Coordonnées sur une grille propre sans chevauchement : x entre 20 et 80, y entre 18 et 84, width entre 28 et 42.
tone autorisés : "blue", "amber", "green", "red", "slate".
Libellés courts (<= 26 caractères).

Schémas à générer :
${diagramRequests
  .map((r) => `- targetKey: "${r.targetKey}" | Fiche: "${r.contextTitle}" | Titre schéma: "${r.title}"`)
  .join('\n')}
`;
              const repairResp = await generateWithRetry(
                mainStageLabel,
                repairPrompt,
                diagramRepairSchema,
                ThinkingLevel.LOW,
                false
              );
              const repaired = JSON.parse((repairResp.text ?? '{"diagrams":[]}').trim()) as {
                diagrams?: Array<{
                  targetKey: string;
                  title: string;
                  footnote?: string;
                  nodes: unknown[];
                  edges: unknown[];
                }>;
              };
              const byKey = new Map(
                (repaired.diagrams || []).map((d) => [d.targetKey, d] as const)
              );
              for (const reqInfo of diagramRequests) {
                const match = byKey.get(reqInfo.targetKey);
                if (match && Array.isArray(match.nodes) && match.nodes.length > 0) {
                  const secObj = cardsData.cards[reqInfo.cardIdx]?.[reqInfo.side]?.sections?.[
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

          const cards: FicheCard[] = (cardsData.cards || []).map((c, idx) => {
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
              fontSizePt: 8.8,
              lineHeight: 1.3,
              leftSide: {
                sections: (c.leftSide?.sections || []).map((s, sIdx) => ({
                  id: typeof s.id === 'string' && s.id ? s.id : `l-s-${idx}-${sIdx}`,
                  romanNumeral: String(s.romanNumeral || `${sIdx + 1}.`),
                  title: String(s.title || 'Section'),
                  isSubHeader: Boolean(s.isSubHeader),
                  blocks: sanitizeGeneratedBlocks(
                    Array.isArray(s.blocks) ? (s.blocks as Record<string, unknown>[]) : [],
                    `l-${idx}-${sIdx}`
                  ),
                })),
              },
              rightSide: {
                sections: (c.rightSide?.sections || []).map((s, sIdx) => ({
                  id: typeof s.id === 'string' && s.id ? s.id : `r-s-${idx}-${sIdx}`,
                  romanNumeral: String(s.romanNumeral || `${sIdx + 1}.`),
                  title: String(s.title || 'Section'),
                  isSubHeader: Boolean(s.isSubHeader),
                  blocks: sanitizeGeneratedBlocks(
                    Array.isArray(s.blocks) ? (s.blocks as Record<string, unknown>[]) : [],
                    `r-${idx}-${sIdx}`
                  ),
                })),
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

          const sourceNames = [
            ...preUploadedFiles.map((pf) => pf.displayName || 'document.pdf'),
            ...bufferedFiles.map((f) => ensurePdfFilename(f.originalname)),
          ];

          const deck: FicheDeck = {
            id: `deck-${Date.now()}`,
            title: cardsData.deckTitle || cards[0].title,
            className,
            subject,
            dateLabel,
            sourceFileNames: sourceNames,
            metaPromptName,
            cards,
            verification: {
              sourcesAnalyzed: sourceNames,
              extractedSections,
              notes: cardsData.verificationNotes || undefined,
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
