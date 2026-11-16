import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  FileUp,
  Loader2,
  Printer,
  Sliders,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  FicheCard,
  FicheDeck,
  MetaPromptPreset,
  PrintProfile,
  SubjectKey,
} from '../types/fiche';
import {
  buildCompiledMetaPrompt,
  computeAutoSideTypography,
  estimateSideDensity,
  formatDateShort,
  parseDeckFromJsonInput,
  rebalanceCardLayout,
  SUBJECT_PALETTES,
} from '../utils/ficheLogic';
import { ensurePdfFilename, validatePdfCandidate } from '../utils/pdfValidation';
import { FicheSheetPreview } from './FicheSheetPreview';

interface SelectedPdfItem {
  id: string;
  file: File;
  displayName: string;
}

interface AtelierViewProps {
  activeDeck: FicheDeck | null;
  presets: MetaPromptPreset[];
  printProfile: PrintProfile;
  onDeckCreated: (deck: FicheDeck) => void;
  onUpdateDeck: (deck: FicheDeck) => void;
  onPrintAll: () => void;
}

export const AtelierView: React.FC<AtelierViewProps> = ({
  activeDeck,
  presets,
  printProfile,
  onDeckCreated,
  onUpdateDeck,
  onPrintAll,
}) => {
  const [pdfFiles, setPdfFiles] = useState<SelectedPdfItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [className, setClassName] = useState(activeDeck?.className || '2ndE');
  const [subject, setSubject] = useState<SubjectKey>(activeDeck?.subject || 'SVT');
  const [dateLabel, setDateLabel] = useState(formatDateShort());
  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState<'auto' | '1' | '2' | '3' | '4'>('auto');
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id || '');
  const [extraInstructions, setExtraInstructions] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(0.68);
  const [showPromptDrawer, setShowPromptDrawer] = useState(false);
  const [showVerificationDrawer, setShowVerificationDrawer] = useState(false);

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || presets[0],
    [presets, selectedPresetId]
  );

  const currentCard: FicheCard | null = useMemo(() => {
    if (!activeDeck || activeDeck.cards.length === 0) return null;
    const safeIdx = Math.min(activeCardIndex, activeDeck.cards.length - 1);
    return activeDeck.cards[safeIdx];
  }, [activeDeck, activeCardIndex]);

  const isAutoFill = currentCard?.autoFillHeight !== false;

  const leftDensity = useMemo(() => {
    if (!currentCard) return null;
    if (isAutoFill) {
      const auto = computeAutoSideTypography(
        currentCard.leftSide,
        currentCard.fontSizePt,
        currentCard.lineHeight,
        'recto'
      );
      return estimateSideDensity(currentCard.leftSide, auto.fontSizePt, auto.lineHeight, 'recto');
    }
    return estimateSideDensity(
      currentCard.leftSide,
      currentCard.fontSizePt,
      currentCard.lineHeight,
      'recto'
    );
  }, [currentCard, isAutoFill]);

  const rightDensity = useMemo(() => {
    if (!currentCard) return null;
    if (isAutoFill) {
      const auto = computeAutoSideTypography(
        currentCard.rightSide,
        currentCard.fontSizePt,
        currentCard.lineHeight,
        'verso'
      );
      return estimateSideDensity(currentCard.rightSide, auto.fontSizePt, auto.lineHeight, 'verso');
    }
    return estimateSideDensity(
      currentCard.rightSide,
      currentCard.fontSizePt,
      currentCard.lineHeight,
      'verso'
    );
  }, [currentCard, isAutoFill]);

  const handleFilesSelected = async (candidates: File[]) => {
    if (candidates.length === 0) return;

    setIsCheckingFiles(true);
    setFileError(null);
    setErrorMessage(null);

    try {
      const accepted: SelectedPdfItem[] = [];
      const rejectedReasons: string[] = [];

      for (let i = 0; i < candidates.length; i += 1) {
        const file = candidates[i];
        if (file.size > 35 * 1024 * 1024) {
          rejectedReasons.push(`« ${file.name} » dépasse 35 Mo.`);
          continue;
        }

        let materializedFile: File = file;
        let headerBytes: Uint8Array | undefined;

        try {
          if (file.size > 0) {
            const fullBuffer = await file.arrayBuffer();
            const fullView = new Uint8Array(fullBuffer);
            headerBytes = fullView.subarray(0, Math.min(1024, fullView.length));
            const safeName = ensurePdfFilename(file.name, pdfFiles.length + accepted.length + 1);
            materializedFile = new File([fullBuffer], safeName, {
              type: 'application/pdf',
              lastModified: file.lastModified || Date.now(),
            });
          }
        } catch {
          try {
            if (file.size > 0) {
              const slice = await file.slice(0, 1024).arrayBuffer();
              headerBytes = new Uint8Array(slice);
            }
          } catch {
            headerBytes = undefined;
          }
        }

        const check = validatePdfCandidate(
          { name: file.name, type: file.type, size: materializedFile.size },
          headerBytes
        );

        if (!check.valid) {
          if (check.reason === 'empty') {
            rejectedReasons.push(
              `« ${file.name || 'Fichier'} » est vide (0 octet) — vérifiez qu'il est téléchargé depuis Drive.`
            );
          } else {
            rejectedReasons.push(`« ${file.name || 'Fichier'} » n'est pas un document PDF valide.`);
          }
          continue;
        }

        const displayName = ensurePdfFilename(file.name, pdfFiles.length + accepted.length + 1);
        accepted.push({
          id: `${displayName}-${materializedFile.size}-${Date.now()}-${i}`,
          file: materializedFile,
          displayName,
        });
      }

      if (accepted.length > 0) {
        setPdfFiles((prev) => [...prev, ...accepted].slice(0, 5));
      }

      if (rejectedReasons.length > 0) {
        setFileError(rejectedReasons[0]);
      }
    } finally {
      setIsCheckingFiles(false);
    }
  };

  const removeFile = (idx: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError(null);
  };

  const parseJsonSafe = async <T,>(response: Response, endpointLabel = 'API'): Promise<T> => {
    const rawText = await response.text();
    const trimmed = rawText.trim();
    const contentType = response.headers.get('content-type') || '';

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error(
            'Fichier trop volumineux pour la requête. Essayez avec un PDF plus léger.'
          );
        }
        throw new Error(`Erreur serveur (${response.status}) sur ${endpointLabel}.`);
      }

      if (!trimmed) {
        throw new Error(
          `Réponse vide du serveur (${endpointLabel}, HTTP ${response.status}).`
        );
      }

      if (contentType.includes('text/html') || trimmed.startsWith('<')) {
        throw new Error(
          `Le serveur a renvoyé une page HTML au lieu de JSON (${endpointLabel}, HTTP ${response.status}). Rechargez la page puis réessayez.`
        );
      }

      throw new Error(
        `Réponse serveur non-JSON (${endpointLabel}, HTTP ${response.status}) : ${trimmed.slice(0, 100)}`
      );
    }
  };

  const fetchWithRetry = async (
    url: string,
    initFactory: () => RequestInit,
    retries = 2
  ): Promise<Response> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, {
          credentials: 'same-origin',
          ...initFactory(),
        });
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Erreur réseau.');
  };

  const uploadSinglePdfChunked = async (
    item: SelectedPdfItem,
    fileIndex: number,
    totalFiles: number
  ): Promise<{
    uri: string;
    name: string;
    mimeType: string;
    displayName: string;
    localCacheId?: string;
  }> => {
    const CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5 MB per HTTP request for mobile & Cloud Run reliability
    const totalChunks = Math.max(1, Math.ceil(item.file.size / CHUNK_SIZE));
    const uploadId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `up-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(item.file.size, start + CHUNK_SIZE);
      const slice = item.file.slice(start, end);
      const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);

      setGenerationStage(
        `Envoi de ${item.displayName} (${fileIndex + 1}/${totalFiles} · ${pct}%)...`
      );

      const chunkRes = await fetchWithRetry('/api/upload-pdf/chunk', () => {
        const chunkForm = new FormData();
        chunkForm.append('uploadId', uploadId);
        chunkForm.append('chunkIndex', String(chunkIndex));
        chunkForm.append('totalChunks', String(totalChunks));
        chunkForm.append('totalSize', String(item.file.size));
        chunkForm.append('fileName', item.displayName);
        chunkForm.append('chunk', slice, item.displayName);
        return {
          method: 'POST',
          body: chunkForm,
        };
      });

      const chunkData = await parseJsonSafe<{ ok?: boolean; error?: string }>(
        chunkRes,
        '/api/upload-pdf/chunk'
      );
      if (!chunkRes.ok || !chunkData.ok) {
        throw new Error(
          chunkData.error || `Échec d'envoi du fragment ${chunkIndex + 1}/${totalChunks}.`
        );
      }
    }

    setGenerationStage(`Enregistrement de ${item.displayName}...`);

    const completeRes = await fetchWithRetry('/api/upload-pdf/complete', () => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    }));

    const completeData = await parseJsonSafe<{
      uri?: string;
      name?: string;
      mimeType?: string;
      displayName?: string;
      localCacheId?: string;
      error?: string;
    }>(completeRes, '/api/upload-pdf/complete');

    if (!completeRes.ok || !completeData.uri || !completeData.name) {
      throw new Error(
        completeData.error || `Impossible d'assembler le PDF ${item.displayName}.`
      );
    }

    return {
      uri: completeData.uri,
      name: completeData.name,
      mimeType: completeData.mimeType || 'application/pdf',
      displayName: completeData.displayName || item.displayName,
      ...(completeData.localCacheId ? { localCacheId: completeData.localCacheId } : {}),
    };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pdfFiles.length === 0) {
      setErrorMessage('Ajoutez au moins un PDF (cours scanné ou manuel) avant de générer.');
      return;
    }

    setErrorMessage(null);
    setFileError(null);
    setIsGenerating(true);
    setGenerationStage('Préparation des PDF...');

    try {
      const compiledPrompt = buildCompiledMetaPrompt({
        template: selectedPreset?.template || '',
        className,
        subject,
        topic: topic.trim() || 'Notions principales des sources jointes',
        cardCount,
        extraInstructions,
      });

      const totalBytes = pdfFiles.reduce((sum, item) => sum + item.file.size, 0);
      const shouldUploadViaChunks =
        totalBytes > 2.5 * 1024 * 1024 || pdfFiles.some((item) => item.file.size > 1.5 * 1024 * 1024);

      const preUploadedFiles: Array<{
        uri: string;
        name: string;
        mimeType: string;
        displayName: string;
        localCacheId?: string;
      }> = [];
      const inlineFiles: SelectedPdfItem[] = [];

      if (shouldUploadViaChunks) {
        for (let i = 0; i < pdfFiles.length; i += 1) {
          const uploaded = await uploadSinglePdfChunked(pdfFiles[i], i, pdfFiles.length);
          preUploadedFiles.push(uploaded);
        }
      } else {
        inlineFiles.push(...pdfFiles);
      }

      setGenerationStage('Lancement de l’analyse intégrale page par page...');

      const buildGenerateBody = () => {
        const formData = new FormData();
        for (const item of inlineFiles) {
          formData.append('pdfs', item.file, item.displayName);
        }
        if (preUploadedFiles.length > 0) {
          formData.append('uploadedFiles', JSON.stringify(preUploadedFiles));
        }
        formData.append('className', className.trim() || '2ndE');
        formData.append('subject', subject);
        formData.append('dateLabel', dateLabel.trim() || formatDateShort());
        formData.append('topic', topic.trim() || 'Chapitre complet');
        formData.append('cardCount', cardCount);
        formData.append('metaPrompt', compiledPrompt);
        formData.append('metaPromptName', selectedPreset?.name || 'Méta-Prompt NotebookLM');
        formData.append('extraInstructions', extraInstructions);
        formData.append('visualStyle', printProfile.defaultVisualStyle);
        return formData;
      };

      const startRes = await fetchWithRetry('/api/generate-fiches', () => ({
        method: 'POST',
        body: buildGenerateBody(),
      }));

      const startData = await parseJsonSafe<{
        jobId?: string;
        status?: 'running' | 'done' | 'error';
        stageMessage?: string;
        deck?: FicheDeck;
        error?: string;
      }>(startRes, '/api/generate-fiches');

      if (!startRes.ok) {
        throw new Error(startData.error || 'Échec du lancement de la génération.');
      }

      let generatedDeck: FicheDeck | null = startData.deck || null;

      if (!generatedDeck && startData.jobId) {
        const jobId = startData.jobId;
        if (startData.stageMessage) {
          setGenerationStage(startData.stageMessage);
        }

        let consecutivePollFailures = 0;
        const maxPollFailures = 8;
        const pollStartedAt = Date.now();
        const maxWaitMs = 8 * 60 * 1000;

        while (!generatedDeck) {
          if (Date.now() - pollStartedAt > maxWaitMs) {
            throw new Error('La génération dépasse le délai maximal. Essayez avec moins de pages.');
          }

          await new Promise((r) => setTimeout(r, 1500));

          try {
            const pollRes = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
              cache: 'no-store',
              credentials: 'same-origin',
            });
            const pollData = await parseJsonSafe<{
              status?: 'running' | 'done' | 'error';
              stageMessage?: string;
              elapsedMs?: number;
              deck?: FicheDeck;
              error?: string;
            }>(pollRes, `/api/jobs/${jobId}`);

            if (!pollRes.ok) {
              throw new Error(pollData.error || `Erreur de suivi (${pollRes.status}).`);
            }

            consecutivePollFailures = 0;

            if (pollData.status === 'error') {
              throw new Error(pollData.error || 'Échec de la génération des fiches.');
            }

            if (pollData.status === 'done' && pollData.deck) {
              generatedDeck = pollData.deck;
              break;
            }

            const secs = Math.floor((pollData.elapsedMs || Date.now() - pollStartedAt) / 1000);
            const baseMsg = pollData.stageMessage || 'Rédaction des fiches en cours...';
            setGenerationStage(`${baseMsg} (${secs}s)`);
          } catch (pollErr) {
            const isNetworkErr =
              pollErr instanceof TypeError ||
              (pollErr instanceof Error && pollErr.message === 'Failed to fetch');
            if (isNetworkErr && consecutivePollFailures < maxPollFailures) {
              consecutivePollFailures += 1;
              continue;
            }
            throw pollErr;
          }
        }
      }

      if (!generatedDeck) {
        throw new Error('Aucune fiche générée par le serveur.');
      }

      setActiveCardIndex(0);
      onDeckCreated(generatedDeck);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erreur réseau lors de la génération.';
      setErrorMessage(
        msg === 'Failed to fetch'
          ? 'Connexion interrompue pendant l’envoi ou l’analyse des PDF. Vérifiez votre réseau et réessayez.'
          : msg
      );
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  const handleUpdateCurrentCard = (updatedCard: FicheCard) => {
    if (!activeDeck) return;
    const nextCards = activeDeck.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    onUpdateDeck({
      ...activeDeck,
      title: nextCards[0]?.title || activeDeck.title,
      cards: nextCards,
    });
  };

  const handleImportJson = () => {
    try {
      setJsonError(null);
      const deck = parseDeckFromJsonInput(jsonImportText);
      setActiveCardIndex(0);
      onDeckCreated(deck);
      setShowJsonModal(false);
      setJsonImportText('');
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'JSON invalide.');
    }
  };

  const handleExportCurrentJson = () => {
    if (!activeDeck) return;
    const blob = new Blob([JSON.stringify(activeDeck, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDeck.subject.toLowerCase()}-${activeDeck.className.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_290px] min-h-[calc(100vh-65px)] bg-slate-50">
      {/* Left Sidebar: Sources & NotebookLM Prompt */}
      <aside className="bg-white border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 whitespace-nowrap">
            1. Sources & Prompt
          </h2>
          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" />
            Importer JSON
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3.5">
          {/* Dropzone */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cours scanné + Manuel optionnel (PDF)
            </span>
            <input
              id="atelier-pdf-input"
              type="file"
              accept=".pdf,application/pdf,application/x-pdf,application/octet-stream"
              multiple
              onChange={(e) => {
                const picked = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
                e.currentTarget.value = '';
                void handleFilesSelected(picked);
              }}
              className="sr-only"
            />
            <label
              htmlFor="atelier-pdf-input"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
                void handleFilesSelected(dropped);
              }}
              className={`block w-full min-h-[86px] border border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
                isDraggingOver
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40'
              }`}
            >
              {isCheckingFiles ? (
                <Loader2 className="w-5 h-5 text-blue-700 mx-auto mb-1 animate-spin" />
              ) : (
                <FileUp className="w-5 h-5 text-blue-700 mx-auto mb-1" />
              )}
              <div className="text-xs font-semibold text-slate-800">
                {isCheckingFiles ? 'Vérification du PDF...' : 'Déposer ou choisir des PDF'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Jusqu’à 5 fichiers (scans & Drive acceptés)
              </div>
            </label>

            {fileError && (
              <div
                role="alert"
                className="mt-2 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-[11px] text-red-800"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                <span>{fileError}</span>
              </div>
            )}

            {pdfFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {pdfFiles.length} PDF {pdfFiles.length > 1 ? 'reçus' : 'reçu'}
                  </span>
                  <span className="font-mono-tabular text-slate-500">
                    {(() => {
                      const total = pdfFiles.reduce((acc, item) => acc + item.file.size, 0);
                      return total < 100 * 1024
                        ? `${Math.max(1, Math.round(total / 1024))} Ko`
                        : `${(total / (1024 * 1024)).toFixed(1)} Mo`;
                    })()}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {pdfFiles.map((item, idx) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span className="truncate font-medium text-slate-800">
                          {item.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono-tabular text-[11px] text-slate-500">
                          {item.file.size < 100 * 1024
                            ? `${Math.max(1, Math.round(item.file.size / 1024))} Ko`
                            : `${(item.file.size / (1024 * 1024)).toFixed(1)} Mo`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          aria-label={`Retirer ${item.displayName}`}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Class & Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="atelier-class" className="block text-xs font-semibold text-slate-700 mb-1">
                Classe
              </label>
              <input
                id="atelier-class"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="2ndE"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="atelier-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <input
                id="atelier-date"
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="14/11"
                className="w-full px-2.5 py-1.5 text-sm font-mono-tabular border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="atelier-subject" className="block text-xs font-semibold text-slate-700 mb-1">
              Matière & Couleur pastel
            </label>
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded border border-slate-300 shrink-0"
                style={{ backgroundColor: SUBJECT_PALETTES[subject].backgroundHex }}
              />
              <select
                id="atelier-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectKey)}
                className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {Object.values(SUBJECT_PALETTES).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label htmlFor="atelier-topic" className="block text-xs font-semibold text-slate-700 mb-1">
              Chapitre / Sujet ciblé
            </label>
            <input
              id="atelier-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex. Rome antique, Lois de Snell-Descartes..."
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Meta-prompt preset + Card count */}
          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label htmlFor="atelier-preset" className="block text-xs font-semibold text-slate-700 mb-1">
                Méta-Prompt NotebookLM
              </label>
              <select
                id="atelier-preset"
                value={selectedPreset?.id || ''}
                onChange={(e) => {
                  const next = presets.find((p) => p.id === e.target.value);
                  setSelectedPresetId(e.target.value);
                  if (next) setCardCount(next.defaultCardCount);
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de fiches (14 × 19 cm R/V)
              </label>
              <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg">
                {(['auto', '1', '2', '3', '4'] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setCardCount(cnt)}
                    className={`py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      cardCount === cnt
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cnt === 'auto' ? 'Auto' : `${cnt}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Extra Instructions */}
          <div>
            <label htmlFor="atelier-extra" className="block text-xs font-semibold text-slate-700 mb-1">
              Consigne complémentaire (optionnel)
            </label>
            <textarea
              id="atelier-extra"
              rows={2}
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              placeholder="Ex. Insister sur le schéma bilan et les dates clés..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Générer depuis les PDF
              </>
            )}
          </button>

          {isGenerating && generationStage && (
            <p className="text-[11px] text-slate-600 text-center">{generationStage}</p>
          )}
        </form>
      </aside>

      {/* Center Stage: Live A4 Landscape Sheet (29.7 x 21 cm) */}
      <section className="flex flex-col min-w-0 bg-slate-100/80">
        {/* Stage Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {activeDeck ? (
              <>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-semibold text-slate-900">{activeDeck.className}</span>
                  <span aria-hidden="true">·</span>
                  <span>{SUBJECT_PALETTES[activeDeck.subject].label}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {printProfile.sheetWidthMm / 10}×{printProfile.sheetHeightMm / 10} cm
                  </span>
                </div>
                {activeDeck.cards.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 rounded-md px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveCardIndex((i) => Math.max(0, i - 1))}
                      disabled={activeCardIndex === 0}
                      aria-label="Fiche précédente"
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-35"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono-tabular font-semibold px-1">
                      Fiche {activeCardIndex + 1}/{activeDeck.cards.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCardIndex((i) => Math.min(activeDeck.cards.length - 1, i + 1))
                      }
                      disabled={activeCardIndex >= activeDeck.cards.length - 1}
                      aria-label="Fiche suivante"
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-35"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500">Aucune fiche sélectionnée</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.45, Number((z - 0.08).toFixed(2))))}
                aria-label="Dézoomer l'aperçu"
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono-tabular px-1.5 text-slate-700">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(1.0, Number((z + 0.08).toFixed(2))))}
                aria-label="Zoomer l'aperçu"
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeDeck && (
              <button
                type="button"
                onClick={onPrintAll}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer / PDF ({activeDeck.cards.length}{' '}
                {activeDeck.cards.length > 1 ? 'feuilles' : 'feuille'})
              </button>
            )}
          </div>
        </div>

        {/* Sheet Canvas */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
          {currentCard ? (
            <FicheSheetPreview
              card={currentCard}
              profile={printProfile}
              scale={zoomScale}
              editable={true}
              onUpdateCard={handleUpdateCurrentCard}
            />
          ) : (
            <div className="max-w-md text-center bg-white border border-slate-200 rounded-xl p-8 mt-12">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Prêt pour votre prochain cours</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                Déposez vos PDF à gauche pour générer automatiquement vos fiches Recto/Verso 14×19 cm
                sur feuille A4 paysage.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Right Inspector: Style, Density & Balance */}
      <aside className="bg-white border-l border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">2. Mise en page & Style</h2>
        </div>

        {currentCard ? (
          <>
            {/* Metadata Quick Edit */}
            <div className="space-y-2.5 pb-3 border-b border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre affiché sur la fiche
                </label>
                <input
                  type="text"
                  value={currentCard.title}
                  onChange={(e) =>
                    handleUpdateCurrentCard({ ...currentCard, title: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classe</label>
                  <input
                    type="text"
                    value={currentCard.className}
                    onChange={(e) =>
                      handleUpdateCurrentCard({ ...currentCard, className: e.target.value })
                    }
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={currentCard.dateLabel}
                    onChange={(e) =>
                      handleUpdateCurrentCard({ ...currentCard, dateLabel: e.target.value })
                    }
                    className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Style Switch 2ndE vs 3eB + Background color */}
            <div className="space-y-2.5 pb-3 border-b border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Style graphique de la fiche
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentCard({ ...currentCard, visualStyle: '2ndE' })
                  }
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    currentCard.visualStyle === '2ndE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  2ndE Pastel Uni
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentCard({ ...currentCard, visualStyle: '3eB' })
                  }
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    currentCard.visualStyle === '3eB'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  3eB Carreaux
                </button>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Couleur de fond pastel
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(SUBJECT_PALETTES).map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={p.label}
                      aria-label={`Couleur ${p.label}`}
                      onClick={() =>
                        handleUpdateCurrentCard({
                          ...currentCard,
                          backgroundHex: p.backgroundHex,
                        })
                      }
                      className={`w-6 h-6 rounded-md border transition-transform ${
                        currentCard.backgroundHex === p.backgroundHex
                          ? 'border-slate-900 scale-110 ring-2 ring-slate-900/20'
                          : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: p.backgroundHex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Typography Density */}
            <div className="space-y-2.5 pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Remplissage auto pleine page
                  </div>
                  <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                    Adapte la taille Recto / Verso séparément pour zéro vide en bas
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAutoFill}
                  aria-label="Remplissage auto pleine page"
                  onClick={() =>
                    handleUpdateCurrentCard({
                      ...currentCard,
                      autoFillHeight: !isAutoFill,
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    isAutoFill ? 'bg-blue-700' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      isAutoFill ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    {isAutoFill ? 'Taille de base' : 'Taille du texte'}
                  </span>
                  <span className="font-mono-tabular text-slate-600">
                    {currentCard.fontSizePt.toFixed(1)} pt
                  </span>
                </div>
                <input
                  type="range"
                  min={7.5}
                  max={11.5}
                  step={0.1}
                  value={currentCard.fontSizePt}
                  onChange={(e) =>
                    handleUpdateCurrentCard({
                      ...currentCard,
                      autoFillHeight: false,
                      fontSizePt: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Interligne</span>
                  <span className="font-mono-tabular text-slate-600">
                    {currentCard.lineHeight.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1.15}
                  max={1.55}
                  step={0.02}
                  value={currentCard.lineHeight}
                  onChange={(e) =>
                    handleUpdateCurrentCard({
                      ...currentCard,
                      autoFillHeight: false,
                      lineHeight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            {/* Fill gauges */}
            {leftDensity && rightDensity && (
              <div className="space-y-2 pb-3 border-b border-slate-200">
                <div className="text-xs font-semibold text-slate-700">
                  Remplissage estimé (14 × 19 cm)
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Recto (gauche)</span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          leftDensity.isOverflowRisk ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {leftDensity.utilizationPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          leftDensity.isOverflowRisk ? 'bg-amber-500' : 'bg-blue-700'
                        }`}
                        style={{ width: `${Math.min(100, leftDensity.utilizationPercent)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Verso (droite)</span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          rightDensity.isOverflowRisk ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {rightDensity.utilizationPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          rightDensity.isOverflowRisk ? 'bg-amber-500' : 'bg-blue-700'
                        }`}
                        style={{ width: `${Math.min(100, rightDensity.utilizationPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Survolez un titre sur la fiche pour basculer une section entre Recto et Verso.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentCard(
                      rebalanceCardLayout({ ...currentCard, autoFillHeight: true })
                    )
                  }
                  className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded-md transition-colors"
                >
                  Rééquilibrer Recto / Verso auto
                </button>
              </div>
            )}

            {/* Verification & Prompt & JSON actions */}
            <div className="space-y-2 mt-auto">
              {activeDeck?.verification && (
                <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/70">
                  <button
                    type="button"
                    onClick={() => setShowVerificationDrawer((v) => !v)}
                    className="w-full text-left text-xs font-semibold text-emerald-900 flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Vérifié ({activeDeck.verification.extractedSections.length} notions)
                      </span>
                    </span>
                    <span className="text-emerald-700 shrink-0">
                      {showVerificationDrawer ? 'Masquer' : 'Détails'}
                    </span>
                  </button>
                  {showVerificationDrawer && (
                    <div className="mt-2 space-y-1.5 text-[11px] text-emerald-950">
                      {activeDeck.verification.notes && (
                        <p className="leading-relaxed text-emerald-900">
                          {activeDeck.verification.notes}
                        </p>
                      )}
                      {activeDeck.verification.extractedSections.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 max-h-36 overflow-y-auto text-[10.5px]">
                          {activeDeck.verification.extractedSections.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentCard.generatedPrompt && (
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setShowPromptDrawer((v) => !v)}
                    className="w-full text-left text-xs font-semibold text-slate-800 flex items-center justify-between"
                  >
                    <span>Prompt NotebookLM généré</span>
                    <span className="text-blue-700">{showPromptDrawer ? 'Masquer' : 'Voir'}</span>
                  </button>
                  {showPromptDrawer && (
                    <p className="mt-2 text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {currentCard.generatedPrompt}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleExportCurrentJson}
                className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Exporter cette fiche (.json)
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Sélectionnez ou générez une fiche pour accéder aux réglages de mise en page.
          </p>
        )}
      </aside>

      {/* JSON Import Modal (Chat-to-App bridge) */}
      {showJsonModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Importer une fiche en JSON"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Importer une fiche (JSON depuis le Chat)
              </h3>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Fermer
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Collez ici le bloc JSON d’une fiche générée dans la conversation pour l’afficher au
              format exact 14 × 19 cm Recto/Verso et l’imprimer immédiatement.
            </p>
            <textarea
              rows={9}
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder='{"title": "...", "subject": "Histoire", "cards": [...]}'
              className="w-full p-2.5 text-xs font-mono-tabular border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
            {jsonError && (
              <div className="text-xs text-red-600 font-medium">{jsonError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Importer et mettre en page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
