import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { FicheVisualStyle, PrintProfile } from '../types/fiche';
import { computeSheetGeometry, DEFAULT_PRINT_PROFILE } from '../utils/ficheLogic';

interface PrintSettingsViewProps {
  profile: PrintProfile;
  onUpdateProfile: (next: PrintProfile) => void;
}

export const PrintSettingsView: React.FC<PrintSettingsViewProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const geom = computeSheetGeometry(profile);

  const updateField = <K extends keyof PrintProfile>(key: K, value: PrintProfile[K]) => {
    onUpdateProfile({ ...profile, [key]: value });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Format de fiche & Impression A4</h1>
          <p className="text-sm text-slate-600 mt-1">
            Configuration calibrée en millimètres : 1 feuille A4 Paysage (29,7 × 21 cm) accueille
            le Recto et le Verso d’une fiche (14 × 19 cm chacun).
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdateProfile(DEFAULT_PRINT_PROFILE)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Rétablir 14 × 19 cm sur A4 Paysage
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Form controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sheet-w" className="block text-xs font-semibold text-slate-700 mb-1">
                Largeur feuille (mm) — A4 Paysage = 297
              </label>
              <input
                id="sheet-w"
                type="number"
                value={profile.sheetWidthMm}
                onChange={(e) => updateField('sheetWidthMm', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="sheet-h" className="block text-xs font-semibold text-slate-700 mb-1">
                Hauteur feuille (mm) — A4 Paysage = 210
              </label>
              <input
                id="sheet-h"
                type="number"
                value={profile.sheetHeightMm}
                onChange={(e) => updateField('sheetHeightMm', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="card-w" className="block text-xs font-semibold text-slate-700 mb-1">
                Largeur fiche (mm)
              </label>
              <input
                id="card-w"
                type="number"
                value={profile.cardWidthMm}
                onChange={(e) => updateField('cardWidthMm', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="card-h" className="block text-xs font-semibold text-slate-700 mb-1">
                Hauteur fiche (mm)
              </label>
              <input
                id="card-h"
                type="number"
                value={profile.cardHeightMm}
                onChange={(e) => updateField('cardHeightMm', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="gutter-mm" className="block text-xs font-semibold text-slate-700 mb-1">
                Espace central (mm)
              </label>
              <input
                id="gutter-mm"
                type="number"
                min={0}
                max={30}
                value={profile.gutterMm}
                onChange={(e) => updateField('gutterMm', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {!geom.fitsOnSheet && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Attention : deux fiches de {profile.cardWidthMm} mm + {profile.gutterMm} mm
                d’espace ({geom.totalContentWidthMm} mm) dépassent la feuille ({profile.sheetWidthMm}{' '}
                mm).
              </span>
            </div>
          )}

          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-800">
                Afficher les repères de découpe aux coins (traits de coupe)
              </span>
              <input
                type="checkbox"
                checked={profile.showCutMarks}
                onChange={(e) => updateField('showCutMarks', e.target.checked)}
                className="w-4 h-4 accent-blue-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-800">
                Afficher « RECTO / VERSO » dans la marge supérieure (hors découpe)
              </span>
              <input
                type="checkbox"
                checked={profile.showSideLabels}
                onChange={(e) => updateField('showSideLabels', e.target.checked)}
                className="w-4 h-4 accent-blue-700"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Style par défaut des nouvelles fiches générées
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['2ndE', '3eB'] as FicheVisualStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updateField('defaultVisualStyle', style)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    profile.defaultVisualStyle === style
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">
                    {style === '2ndE'
                      ? 'Style 2ndE (Pastel uni · Mots-clés rouges)'
                      : 'Style 3eB (Petits carreaux · Titres contours)'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live geometric blueprint */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Gabarit calculé</h3>
            <p className="text-xs text-slate-500 mb-4">
              Centrage automatique des deux faces sur la feuille.
            </p>

            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-center justify-center">
              <div
                className="bg-white border border-slate-400 relative shadow-xs"
                style={{
                  width: '297px',
                  height: '210px',
                }}
              >
                <div
                  className="absolute bg-rose-100 border border-rose-400 flex flex-col items-center justify-center text-[11px] font-bold text-slate-800"
                  style={{
                    left: `${Math.max(0, geom.leftCardXMm)}px`,
                    top: `${Math.max(0, geom.cardYMm)}px`,
                    width: `${profile.cardWidthMm}px`,
                    height: `${profile.cardHeightMm}px`,
                  }}
                >
                  <span>RECTO</span>
                  <span className="font-mono-tabular font-normal text-[10px] text-slate-600">
                    {profile.cardWidthMm / 10} × {profile.cardHeightMm / 10} cm
                  </span>
                </div>
                <div
                  className="absolute bg-rose-100 border border-rose-400 flex flex-col items-center justify-center text-[11px] font-bold text-slate-800"
                  style={{
                    left: `${Math.max(0, geom.rightCardXMm)}px`,
                    top: `${Math.max(0, geom.cardYMm)}px`,
                    width: `${profile.cardWidthMm}px`,
                    height: `${profile.cardHeightMm}px`,
                  }}
                >
                  <span>VERSO</span>
                  <span className="font-mono-tabular font-normal text-[10px] text-slate-600">
                    {profile.cardWidthMm / 10} × {profile.cardHeightMm / 10} cm
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono-tabular text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div>Marges G/D : {geom.marginLeftMm} mm</div>
            <div>Marges H/B : {geom.marginTopMm} mm</div>
            <div>Gouttière : {profile.gutterMm} mm</div>
            <div>Feuille : {profile.sheetWidthMm}×{profile.sheetHeightMm} mm</div>
          </div>
        </div>
      </div>
    </div>
  );
};
