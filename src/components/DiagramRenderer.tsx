import React, { useId } from 'react';
import type { DiagramEdge, DiagramGroup, DiagramNode } from '../types/fiche';
import { computeDiagramLayout } from '../utils/diagramLayout';
import { sanitizeDiagramData } from '../utils/ficheLogic';

interface DiagramRendererProps {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  footnote?: string;
}

const NODE_TONES: Record<
  NonNullable<DiagramNode['tone']>,
  { fill: string; stroke: string; text: string; groupFill: string; groupText: string }
> = {
  blue: {
    fill: '#BFE3FA',
    stroke: '#2563EB',
    text: '#0F172A',
    groupFill: '#EFF6FF',
    groupText: '#1E3A8A',
  },
  amber: {
    fill: '#FDE6BD',
    stroke: '#EA580C',
    text: '#0F172A',
    groupFill: '#FFF7ED',
    groupText: '#9A3412',
  },
  green: {
    fill: '#C7F2CF',
    stroke: '#16A34A',
    text: '#0F172A',
    groupFill: '#F0FDF4',
    groupText: '#14532D',
  },
  red: {
    fill: '#FEE2E2',
    stroke: '#DC2626',
    text: '#7F1D1D',
    groupFill: '#FEF2F2',
    groupText: '#7F1D1D',
  },
  slate: {
    fill: '#E2E8F0',
    stroke: '#475569',
    text: '#0F172A',
    groupFill: '#F8FAFC',
    groupText: '#1E293B',
  },
};

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  title,
  nodes: rawNodes,
  edges: rawEdges,
  groups: rawGroups,
  footnote,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const arrowSolidId = `fiche-arrow-solid-${uid}`;
  const arrowDashedId = `fiche-arrow-dashed-${uid}`;
  const shadowId = `fiche-node-shadow-${uid}`;

  const clean = sanitizeDiagramData({
    title,
    nodes: rawNodes,
    edges: rawEdges,
    groups: rawGroups,
    footnote,
  });

  if (clean.nodes.length === 0) {
    return (
      <div className="my-1.5 rounded-lg bg-white/52 border border-slate-900/14 p-2 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="text-[8.1pt] font-bold text-slate-800">{clean.title}</div>
        {clean.footnote && (
          <div className="mt-0.5 text-[7.2pt] text-slate-700 italic">{clean.footnote}</div>
        )}
      </div>
    );
  }

  const layout = computeDiagramLayout({
    nodes: clean.nodes,
    edges: clean.edges,
    groups: clean.groups,
    width: 480,
  });

  return (
    <div className="my-1.5 rounded-lg bg-white/52 border border-slate-900/14 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-2.5 py-1.5">
      {clean.title && (
        <div className="text-center text-[8pt] font-bold text-slate-900 pb-1 mb-1 border-b border-slate-900/[0.08] leading-tight tracking-[0.01em]">
          {clean.title}
        </div>
      )}
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-auto block"
        role="img"
        aria-label={clean.title || 'Schéma bilan'}
      >
        <defs>
          <filter id={shadowId} x="-5%" y="-8%" width="110%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0F172A" floodOpacity="0.07" />
          </filter>
          <marker
            id={arrowSolidId}
            viewBox="0 0 10 10"
            refX="7.5"
            refY="5"
            markerWidth="5.2"
            markerHeight="5.2"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.2 L 9.5 5 L 0 8.8 z" fill="#1E293B" />
          </marker>
          <marker
            id={arrowDashedId}
            viewBox="0 0 10 10"
            refX="7.5"
            refY="5"
            markerWidth="5.2"
            markerHeight="5.2"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.2 L 9.5 5 L 0 8.8 z" fill="#334155" />
          </marker>
        </defs>

        {/* Optional visual groups / containers */}
        {layout.groups.map((grp) => {
          const tone = NODE_TONES[grp.tone] ?? NODE_TONES.blue;
          return (
            <g key={grp.id}>
              <rect
                x={grp.x}
                y={grp.y}
                width={grp.width}
                height={grp.height}
                rx="7"
                fill={tone.groupFill}
                fillOpacity="0.62"
                stroke={tone.stroke}
                strokeWidth="1.15"
              />
              <text
                x={grp.x + grp.width / 2}
                y={grp.y + 11.5}
                textAnchor="middle"
                fontSize="7.9"
                fontWeight="800"
                fill={tone.groupText}
              >
                {grp.title}
              </text>
              {grp.subtitle && (
                <text
                  x={grp.x + grp.width / 2}
                  y={grp.y + 20.5}
                  textAnchor="middle"
                  fontSize="7.0"
                  fontWeight="500"
                  fill="#475569"
                >
                  {grp.subtitle}
                </text>
              )}
            </g>
          );
        })}

        {/* Orthogonal rounded edges */}
        {layout.edges.map((edge) => (
          <g key={edge.id}>
            <path
              d={edge.pathD}
              fill="none"
              stroke={edge.dashed ? '#334155' : '#1E293B'}
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={edge.dashed ? '4 3' : undefined}
              markerEnd={edge.dashed ? `url(#${arrowDashedId})` : `url(#${arrowSolidId})`}
            />
            {edge.label && (
              <g>
                <rect
                  x={edge.labelX - edge.badgeW / 2}
                  y={edge.labelY - edge.badgeH / 2}
                  width={edge.badgeW}
                  height={edge.badgeH}
                  rx="3.5"
                  fill="#FFFFFF"
                  fillOpacity="0.92"
                  stroke="#94A3B8"
                  strokeWidth="0.75"
                />
                <text
                  x={edge.labelX}
                  y={edge.labelY + 2.7}
                  textAnchor="middle"
                  fontSize="7.6"
                  fontWeight="700"
                  fill="#0F172A"
                >
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const tone = NODE_TONES[node.tone] ?? NODE_TONES.blue;
          const totalLines = node.labelLines.length + node.sublabelLines.length;
          const lineStepLabel = 10.4;
          const lineStepSub = 8.7;
          const contentH =
            node.labelLines.length * lineStepLabel +
            (node.sublabelLines.length > 0 ? node.sublabelLines.length * lineStepSub + 1.5 : 0);
          let startY = node.cy - contentH / 2 + 8.0;
          if (totalLines === 1) startY = node.cy + 3.0;

          return (
            <g key={node.id}>
              <rect
                x={node.left}
                y={node.top}
                width={node.boxW}
                height={node.boxH}
                rx="7"
                fill={tone.fill}
                fillOpacity="0.94"
                stroke={tone.stroke}
                strokeWidth="1.05"
                filter={`url(#${shadowId})`}
              />
              {node.labelLines.map((line, lIdx) => (
                <text
                  key={`l-${lIdx}`}
                  x={node.cx}
                  y={startY + lIdx * lineStepLabel}
                  textAnchor="middle"
                  fontSize={node.labelFontSize}
                  fontWeight="700"
                  fill={tone.text}
                >
                  {line}
                </text>
              ))}
              {node.sublabelLines.map((line, sIdx) => (
                <text
                  key={`s-${sIdx}`}
                  x={node.cx}
                  y={
                    startY +
                    node.labelLines.length * lineStepLabel +
                    1.2 +
                    sIdx * lineStepSub
                  }
                  textAnchor="middle"
                  fontSize="7.4"
                  fontWeight="500"
                  fill="#334155"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      {clean.footnote && (
        <div className="mt-0.5 text-center text-[7.1pt] text-slate-700 italic leading-tight">
          {clean.footnote}
        </div>
      )}
    </div>
  );
};
