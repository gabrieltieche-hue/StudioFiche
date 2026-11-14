import React, { useId } from 'react';
import type { DiagramEdge, DiagramNode } from '../types/fiche';
import { sanitizeDiagramData } from '../utils/ficheLogic';

interface DiagramRendererProps {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  footnote?: string;
}

const NODE_TONES: Record<
  NonNullable<DiagramNode['tone']>,
  { fill: string; stroke: string; text: string }
> = {
  blue: { fill: '#D9ECFF', stroke: '#2563EB', text: '#0F172A' },
  amber: { fill: '#FCE7CC', stroke: '#D97706', text: '#0F172A' },
  green: { fill: '#D1FADF', stroke: '#16A34A', text: '#0F172A' },
  red: { fill: '#FEE2E2', stroke: '#DC2626', text: '#7F1D1D' },
  slate: { fill: '#334155', stroke: '#1E293B', text: '#FFFFFF' },
};

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  title,
  nodes: rawNodes,
  edges: rawEdges,
  footnote,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const arrowSolidId = `fiche-arrow-solid-${uid}`;
  const arrowDashedId = `fiche-arrow-dashed-${uid}`;

  const clean = sanitizeDiagramData({
    title,
    nodes: rawNodes,
    edges: rawEdges,
    footnote,
  });

  if (clean.nodes.length === 0) {
    return (
      <div className="my-1.5 rounded-lg bg-white/85 border border-slate-900/10 p-2 text-center">
        <div className="text-[8.5pt] font-bold text-slate-800">{clean.title}</div>
        {clean.footnote && (
          <div className="mt-0.5 text-[7.5pt] text-slate-600 italic">{clean.footnote}</div>
        )}
      </div>
    );
  }

  const width = 460;
  const height = 276;
  const padY = 22;

  const nodeMap = new Map<string, DiagramNode>();
  for (const n of clean.nodes) {
    nodeMap.set(n.id, n);
  }

  const getNodeCoords = (node: DiagramNode) => {
    const labelLen = node.label.length;
    const subLen = node.sublabel?.length ?? 0;
    const textLen = Math.max(labelLen, subLen);
    const minWForText = Math.min(220, textLen * 5.7 + 22);
    const requestedW = ((node.width ?? 34) / 100) * width;
    const boxW = Math.max(82, Math.max(minWForText, Math.min(240, requestedW)));
    const boxH = node.sublabel ? 36 : 26;
    const rawCx = (node.x / 100) * width;
    const cx = Math.max(boxW / 2 + 10, Math.min(width - boxW / 2 - 10, rawCx));
    const cy = padY + (node.y / 100) * (height - padY * 2);
    return { cx, cy, boxW, boxH };
  };

  return (
    <div className="my-1.5 rounded-lg bg-white/90 border border-slate-900/15 p-2">
      {clean.title && (
        <div className="text-center text-[8.5pt] font-bold text-slate-800 mb-1">
          {clean.title}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block overflow-visible"
        role="img"
        aria-label={clean.title || 'Schéma bilan'}
      >
        <defs>
          <marker
            id={arrowSolidId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#1E293B" />
          </marker>
          <marker
            id={arrowDashedId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {clean.edges.map((edge, idx) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;

          const f = getNodeCoords(from);
          const t = getNodeCoords(to);

          const dy = t.cy - f.cy;
          const dx = t.cx - f.cx;
          const isHorizontal = Math.abs(dy) < 28 && Math.abs(dx) > 20;
          const isUpwardLoop = dy < -32;

          let pathD = '';
          let labelX = (f.cx + t.cx) / 2;
          let labelY = (f.cy + t.cy) / 2;

          if (isHorizontal) {
            const goingRight = dx > 0;
            const startX = goingRight ? f.cx + f.boxW / 2 : f.cx - f.boxW / 2;
            const endX = goingRight ? t.cx - t.boxW / 2 - 2 : t.cx + t.boxW / 2 + 2;
            pathD = `M ${startX} ${f.cy} L ${endX} ${t.cy}`;
            labelX = (startX + endX) / 2;
            labelY = (f.cy + t.cy) / 2 - 10;
          } else if (isUpwardLoop) {
            const useRightGutter = f.cx > width * 0.55 && t.cx > width * 0.55;
            const gutterX = useRightGutter ? width - 20 : 20;
            const startX = useRightGutter ? f.cx + f.boxW / 2 : f.cx - f.boxW / 2;
            const endX = useRightGutter ? t.cx + t.boxW / 2 + 2 : t.cx - t.boxW / 2 - 2;
            pathD = `M ${startX} ${f.cy} L ${gutterX} ${f.cy} L ${gutterX} ${t.cy} L ${endX} ${t.cy}`;
            labelX = gutterX;
            labelY = (f.cy + t.cy) / 2;
          } else {
            const goingDown = dy >= 0;
            const startY = goingDown ? f.cy + f.boxH / 2 : f.cy - f.boxH / 2;
            const endY = goingDown ? t.cy - t.boxH / 2 - 2 : t.cy + t.boxH / 2 + 2;
            pathD = `M ${f.cx} ${startY} L ${t.cx} ${endY}`;
            labelX = (f.cx + t.cx) / 2;
            labelY = (startY + endY) / 2;
          }

          const pillW = edge.label ? Math.max(26, edge.label.length * 6.0 + 12) : 0;

          return (
            <g key={`${edge.from}-${edge.to}-${idx}`}>
              <path
                d={pathD}
                fill="none"
                stroke={edge.dashed ? '#475569' : '#1E293B'}
                strokeWidth="1.6"
                strokeDasharray={edge.dashed ? '4 3' : undefined}
                markerEnd={edge.dashed ? `url(#${arrowDashedId})` : `url(#${arrowSolidId})`}
              />
              {edge.label && (
                <g>
                  <rect
                    x={labelX - pillW / 2}
                    y={labelY - 7.5}
                    width={pillW}
                    height="15"
                    rx="7"
                    fill="#FFFFFF"
                    stroke="#CBD5E1"
                    strokeWidth="0.9"
                  />
                  <text
                    x={labelX}
                    y={labelY + 3}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#0F172A"
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {clean.nodes.map((node) => {
          const { cx, cy, boxW, boxH } = getNodeCoords(node);
          const toneKey = (node.tone || 'blue') as keyof typeof NODE_TONES;
          const tone = NODE_TONES[toneKey] ?? NODE_TONES.blue;
          const labelFontSize = node.label.length > 24 ? '8.5' : '9.3';

          return (
            <g key={node.id}>
              <rect
                x={cx - boxW / 2}
                y={cy - boxH / 2}
                width={boxW}
                height={boxH}
                rx="6"
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={node.sublabel ? cy - 3 : cy + 3.2}
                textAnchor="middle"
                fontSize={labelFontSize}
                fontWeight="700"
                fill={tone.text}
              >
                {node.label}
              </text>
              {node.sublabel && (
                <text
                  x={cx}
                  y={cy + 10.5}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="500"
                  fill={node.tone === 'slate' ? '#E2E8F0' : '#334155'}
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {clean.footnote && (
        <div className="mt-1 text-center text-[7.5pt] text-slate-600 italic">{clean.footnote}</div>
      )}
    </div>
  );
};
