import type { DiagramEdge, DiagramGroup, DiagramNode } from '../types/fiche';

export interface PositionedDiagramNode {
  id: string;
  labelLines: string[];
  sublabelLines: string[];
  cx: number;
  cy: number;
  boxW: number;
  boxH: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  tone: NonNullable<DiagramNode['tone']>;
  labelFontSize: number;
}

export interface PositionedDiagramGroup {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: NonNullable<DiagramNode['tone']>;
}

export interface RoutedDiagramEdge {
  id: string;
  from: string;
  to: string;
  pathD: string;
  dashed: boolean;
  label?: string;
  labelX: number;
  labelY: number;
  badgeW: number;
  badgeH: number;
}

export interface ComputedDiagramLayout {
  width: number;
  height: number;
  groups: PositionedDiagramGroup[];
  nodes: PositionedDiagramNode[];
  edges: RoutedDiagramEdge[];
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rectsOverlap(a: Rect, b: Rect, pad = 2): boolean {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

export function wrapDiagramText(text: string, maxCharsPerLine: number): string[] {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  if (cleaned.length <= maxCharsPerLine) return [cleaned];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  if (lines.length <= 3) return lines;
  return [lines[0], lines[1], lines.slice(2).join(' ')];
}

function measureTextPx(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56;
}

function buildRoundedOrthogonalPath(rawPoints: Point[], radius = 6): string {
  if (rawPoints.length < 2) return '';
  // Collapse consecutive near-identical points & collinear midpoints
  const pts: Point[] = [];
  for (const p of rawPoints) {
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.5) {
      pts.push({ x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)) });
    }
  }
  if (pts.length < 2) return '';

  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];

    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) {
      d += ` L ${p1.x} ${p1.y}`;
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);
    const ax = p1.x - (v1x / len1) * r;
    const ay = p1.y - (v1y / len1) * r;
    const bx = p1.x + (v2x / len2) * r;
    const by = p1.y + (v2y / len2) * r;

    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function computeDiagramLayout(params: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  width?: number;
}): ComputedDiagramLayout {
  const width = params.width ?? 480;
  const rawNodes = params.nodes;
  const rawEdges = params.edges;
  const rawGroups = params.groups ?? [];

  if (rawNodes.length === 0) {
    return { width, height: 96, groups: [], nodes: [], edges: [] };
  }

  // 1. Identify which edges are upward feedback loops and determine which outer margin they need
  const rawNodeById = new Map(rawNodes.map((n) => [n.id, n]));
  let maxLeftBadgeW = 0;
  let maxRightBadgeW = 0;
  const edgeRailSide = new Map<number, 'left' | 'right' | 'gutter'>();

  rawEdges.forEach((edge, idx) => {
    const f = rawNodeById.get(edge.from);
    const t = rawNodeById.get(edge.to);
    if (!f || !t || f.id === t.id) return;
    if (t.y < f.y - 12) {
      // Cross-column upward jump (e.g. left-column bottom node to right-column upper node)
      if (Math.abs(t.x - f.x) >= 34) {
        edgeRailSide.set(idx, 'gutter');
        return;
      }
      const side: 'left' | 'right' = f.x > 58 && t.x > 58 ? 'right' : 'left';
      edgeRailSide.set(idx, side);
      const badgeW = edge.label ? Math.max(28, measureTextPx(edge.label, 8.0) + 12) : 14;
      if (side === 'left') {
        maxLeftBadgeW = Math.max(maxLeftBadgeW, badgeW);
      } else {
        maxRightBadgeW = Math.max(maxRightBadgeW, badgeW);
      }
    }
  });

  // Reserve safe inner padding ONLY when upward loop rails exist on that side
  const leftMargin = maxLeftBadgeW > 0 ? Math.max(38, maxLeftBadgeW + 16) : 10;
  const rightMargin = maxRightBadgeW > 0 ? Math.max(38, maxRightBadgeW + 16) : 10;
  const usableW = Math.max(240, width - leftMargin - rightMargin);

  // 2. Measure wrapped text & compact box dimensions for each node
  interface WorkNode {
    id: string;
    labelLines: string[];
    sublabelLines: string[];
    cx: number;
    cy: number;
    boxW: number;
    boxH: number;
    tone: NonNullable<DiagramNode['tone']>;
    labelFontSize: number;
    groupId?: string;
  }

  const nodeGroupMap = new Map<string, string>();
  for (const g of rawGroups) {
    for (const nid of g.nodeIds) {
      nodeGroupMap.set(nid, g.id);
    }
  }

  const baseSpreadH = 165;
  const topPad = 12;

  const workNodes: WorkNode[] = rawNodes.map((n) => {
    const labelFontSize = n.label.length > 26 ? 8.3 : 8.9;
    const labelLines = wrapDiagramText(n.label, 25);
    const sublabelLines = n.sublabel ? wrapDiagramText(n.sublabel, 28) : [];

    const maxLabelLineW = Math.max(
      ...labelLines.map((l) => measureTextPx(l, labelFontSize)),
      40
    );
    const maxSubLineW =
      sublabelLines.length > 0
        ? Math.max(...sublabelLines.map((l) => measureTextPx(l, 7.4)), 0)
        : 0;

    const requestedW = ((n.width ?? 36) / 100) * usableW;
    const minNeededW = Math.max(maxLabelLineW, maxSubLineW) + 18;
    const boxW = clamp(Math.max(82, minNeededW, Math.min(215, requestedW)), 82, usableW - 10);

    const labelBlockH = labelLines.length * 10.4;
    const subBlockH = sublabelLines.length > 0 ? sublabelLines.length * 8.7 + 2 : 0;
    const boxH = Math.max(23, Math.round(9 + labelBlockH + subBlockH));

    const normX = clamp(n.x, 0, 100) / 100;
    const normY = clamp(n.y, 0, 100) / 100;

    const rawCx = leftMargin + normX * usableW;
    const cx = clamp(rawCx, leftMargin + boxW / 2, width - rightMargin - boxW / 2);
    const cy = topPad + boxH / 2 + normY * (baseSpreadH - topPad);

    return {
      id: n.id,
      labelLines,
      sublabelLines,
      cx,
      cy,
      boxW,
      boxH,
      tone: (n.tone ?? 'blue') as NonNullable<DiagramNode['tone']>,
      labelFontSize,
      groupId: nodeGroupMap.get(n.id),
    };
  });

  // 3. Cluster nodes into clean horizontal tiers (rows)
  const sortedByY = [...workNodes].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const rows: WorkNode[][] = [];
  for (const node of sortedByY) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      rows.push([node]);
    } else {
      const avgY = lastRow.reduce((s, r) => s + r.cy, 0) / lastRow.length;
      if (Math.abs(node.cy - avgY) <= 22) {
        lastRow.push(node);
      } else {
        rows.push([node]);
      }
    }
  }

  // Sort nodes inside each row left-to-right and separate horizontal overlaps cleanly
  const baseGapX = 16;
  for (const row of rows) {
    row.sort((a, b) => a.cx - b.cx);
    const pairGap = (a: WorkNode, b: WorkNode) =>
      a.groupId && b.groupId && a.groupId !== b.groupId ? 30 : baseGapX;

    const totalGaps = row.reduce(
      (sum, _, i) => (i === 0 ? sum : sum + pairGap(row[i - 1], row[i])),
      0
    );
    const totalBoxW = row.reduce((s, n) => s + n.boxW, 0);
    if (totalBoxW + totalGaps > usableW && row.length > 1) {
      const ratio = (usableW - totalGaps) / totalBoxW;
      for (const n of row) {
        n.boxW = Math.max(72, Math.floor(n.boxW * ratio));
      }
    }

    // Center vs left/right push pass
    for (let i = 1; i < row.length; i += 1) {
      const prev = row[i - 1];
      const curr = row[i];
      const gap = pairGap(prev, curr);
      const minCurrCx = prev.cx + prev.boxW / 2 + gap + curr.boxW / 2;
      if (curr.cx < minCurrCx) {
        curr.cx = minCurrCx;
      }
    }
    // Pull back from right edge if pushed past width - rightMargin
    const last = row[row.length - 1];
    const maxLastCx = width - rightMargin - last.boxW / 2;
    if (last.cx > maxLastCx) {
      last.cx = maxLastCx;
      for (let i = row.length - 2; i >= 0; i -= 1) {
        const next = row[i + 1];
        const curr = row[i];
        const gap = pairGap(curr, next);
        const maxCurrCx = next.cx - next.boxW / 2 - gap - curr.boxW / 2;
        if (curr.cx > maxCurrCx) {
          curr.cx = maxCurrCx;
        }
      }
    }
    // Final left clamp
    for (let i = 0; i < row.length; i += 1) {
      const curr = row[i];
      const minLeft = leftMargin + curr.boxW / 2;
      if (curr.cx < minLeft) curr.cx = minLeft;
    }

    // Align single-node rows near center and symmetrically distribute 2-node ungrouped rows
    if (row.length === 1) {
      const orig = rawNodeById.get(row[0].id);
      if (orig && orig.x >= 34 && orig.x <= 66) {
        row[0].cx = clamp(
          leftMargin + usableW / 2,
          leftMargin + row[0].boxW / 2,
          width - rightMargin - row[0].boxW / 2
        );
      }
    } else if (row.length === 2 && !row[0].groupId && !row[1].groupId) {
      const gap = pairGap(row[0], row[1]);
      const leftCenter = clamp(
        leftMargin + usableW * 0.28,
        leftMargin + row[0].boxW / 2,
        width - rightMargin - row[1].boxW - gap - row[0].boxW / 2
      );
      const rightCenter = clamp(
        leftMargin + usableW * 0.72,
        leftCenter + row[0].boxW / 2 + gap + row[1].boxW / 2,
        width - rightMargin - row[1].boxW / 2
      );
      row[0].cx = leftCenter;
      row[1].cx = rightCenter;
    }
  }

  // 4. Compute exact compact row Y coordinates considering group headers & vertical edge labels
  const rowIndexByNodeId = new Map<string, number>();
  rows.forEach((row, rIdx) => row.forEach((n) => rowIndexByNodeId.set(n.id, rIdx)));

  const groupStartRow = new Map<string, number>();
  for (const g of rawGroups) {
    let minR = Number.POSITIVE_INFINITY;
    for (const nid of g.nodeIds) {
      const rIdx = rowIndexByNodeId.get(nid);
      if (rIdx !== undefined && rIdx < minR) minR = rIdx;
    }
    if (Number.isFinite(minR)) groupStartRow.set(g.id, minR);
  }

  let currentTopY = 8;
  for (let rIdx = 0; rIdx < rows.length; rIdx += 1) {
    const row = rows[rIdx];
    const maxBoxH = Math.max(...row.map((n) => n.boxH));

    // Add extra top room if this row starts a visual group box with header title
    const hasGroupStartHere = row.some((n) => n.groupId && groupStartRow.get(n.groupId) === rIdx);
    const startingGroups = rawGroups.filter(
      (g) => groupStartRow.get(g.id) === rIdx
    );
    const hasGroupSubtitle = startingGroups.some((g) => Boolean(g.subtitle));
    const groupHeaderSpace = hasGroupStartHere ? (hasGroupSubtitle ? 24 : 17) : 0;

    if (rIdx === 0) {
      currentTopY += groupHeaderSpace;
    } else {
      const prevRow = rows[rIdx - 1];
      const prevIds = new Set(prevRow.map((p) => p.id));
      const currIds = new Set(row.map((c) => c.id));
      const hasLabeledVerticalEdge = rawEdges.some(
        (e) =>
          e.label &&
          ((prevIds.has(e.from) && currIds.has(e.to)) ||
            (currIds.has(e.from) && prevIds.has(e.to)))
      );
      const hasCrossBranchEdge = rawEdges.some((e) => {
        if (!prevIds.has(e.from) || !currIds.has(e.to)) return false;
        const fn = row.find((x) => x.id === e.from) ?? prevRow.find((x) => x.id === e.from);
        const tn = row.find((x) => x.id === e.to);
        return fn && tn && Math.abs(fn.cx - tn.cx) > 16;
      });
      const minRowGap = hasLabeledVerticalEdge
        ? hasCrossBranchEdge
          ? hasGroupStartHere
            ? 27
            : 30
          : hasGroupStartHere
            ? 26
            : 28
        : hasCrossBranchEdge
          ? 18
          : 14;
      currentTopY += minRowGap + groupHeaderSpace;
    }

    const rowCy = currentTopY + maxBoxH / 2;
    for (const n of row) {
      n.cy = rowCy;
    }
    currentTopY += maxBoxH;
  }

  // Final node bounds map
  const nodeMap = new Map<string, PositionedDiagramNode>();
  const positionedNodes: PositionedDiagramNode[] = workNodes.map((n) => {
    const p: PositionedDiagramNode = {
      id: n.id,
      labelLines: n.labelLines,
      sublabelLines: n.sublabelLines,
      cx: Math.round(n.cx * 10) / 10,
      cy: Math.round(n.cy * 10) / 10,
      boxW: Math.round(n.boxW * 10) / 10,
      boxH: n.boxH,
      left: Math.round((n.cx - n.boxW / 2) * 10) / 10,
      right: Math.round((n.cx + n.boxW / 2) * 10) / 10,
      top: Math.round((n.cy - n.boxH / 2) * 10) / 10,
      bottom: Math.round((n.cy + n.boxH / 2) * 10) / 10,
      tone: n.tone,
      labelFontSize: n.labelFontSize,
    };
    nodeMap.set(p.id, p);
    return p;
  });

  // 5. Compute compact group container rects around member nodes
  const positionedGroups: PositionedDiagramGroup[] = [];
  for (const g of rawGroups) {
    const members = g.nodeIds
      .map((nid) => nodeMap.get(nid))
      .filter((m): m is PositionedDiagramNode => Boolean(m));
    if (members.length === 0) continue;

    const minL = Math.min(...members.map((m) => m.left));
    const maxR = Math.max(...members.map((m) => m.right));
    const minT = Math.min(...members.map((m) => m.top));
    const maxB = Math.max(...members.map((m) => m.bottom));

    const headerH = g.subtitle ? 26 : 17;
    const gx = Math.max(leftMargin - 8, minL - 10);
    const gr = Math.min(width - rightMargin + 8, maxR + 10);
    const gy = Math.max(4, minT - headerH - 4);
    const gb = maxB + 7;

    positionedGroups.push({
      id: g.id,
      title: g.title,
      subtitle: g.subtitle,
      x: Number(gx.toFixed(1)),
      y: Number(gy.toFixed(1)),
      width: Number((gr - gx).toFixed(1)),
      height: Number((gb - gy).toFixed(1)),
      tone: (g.tone ?? 'blue') as NonNullable<DiagramNode['tone']>,
    });
  }

  // 6. Compute orthogonal edges with multi-port spread & non-clipping label placement
  const outgoingDownCount = new Map<string, number>();
  const outgoingDownIndex = new Map<number, number>();
  const incomingTopCount = new Map<string, number>();
  const incomingTopIndex = new Map<number, number>();

  // Group outgoing downward edges by source node, sorted by target cx
  const downByFrom = new Map<string, number[]>();
  const downByTo = new Map<string, number[]>();

  rawEdges.forEach((edge, idx) => {
    const f = nodeMap.get(edge.from);
    const t = nodeMap.get(edge.to);
    if (!f || !t || f.id === t.id) return;
    if (edgeRailSide.has(idx)) return; // upward loop handled separately
    if (Math.abs(t.cy - f.cy) <= 10) return; // horizontal

    const fArr = downByFrom.get(f.id) ?? [];
    fArr.push(idx);
    downByFrom.set(f.id, fArr);

    const tArr = downByTo.get(t.id) ?? [];
    tArr.push(idx);
    downByTo.set(t.id, tArr);
  });

  for (const [fid, indices] of downByFrom.entries()) {
    indices.sort((a, b) => {
      const ta = nodeMap.get(rawEdges[a].to)!;
      const tb = nodeMap.get(rawEdges[b].to)!;
      return ta.cx - tb.cx;
    });
    outgoingDownCount.set(fid, indices.length);
    indices.forEach((edgeIdx, order) => outgoingDownIndex.set(edgeIdx, order));
  }

  for (const [tid, indices] of downByTo.entries()) {
    indices.sort((a, b) => {
      const fa = nodeMap.get(rawEdges[a].from)!;
      const fb = nodeMap.get(rawEdges[b].from)!;
      return fa.cx - fb.cx;
    });
    incomingTopCount.set(tid, indices.length);
    indices.forEach((edgeIdx, order) => incomingTopIndex.set(edgeIdx, order));
  }

  const groupByNodeId = new Map<string, PositionedDiagramGroup>();
  for (const g of rawGroups) {
    const pg = positionedGroups.find((item) => item.id === g.id);
    if (!pg) continue;
    for (const nid of g.nodeIds) {
      groupByNodeId.set(nid, pg);
    }
  }

  const placedLabelRects: Rect[] = [];
  const nodeRects: Rect[] = positionedNodes.map((n) => ({
    left: n.left,
    right: n.right,
    top: n.top,
    bottom: n.bottom,
  }));
  const groupHeaderRects: Rect[] = positionedGroups.map((g) => ({
    left: g.x,
    right: g.x + g.width,
    top: g.y,
    bottom: g.y + (g.subtitle ? 23 : 16),
  }));

  let leftRailCounter = 0;
  let rightRailCounter = 0;

  const routedEdges: RoutedDiagramEdge[] = [];

  rawEdges.forEach((edge, idx) => {
    const f = nodeMap.get(edge.from);
    const t = nodeMap.get(edge.to);
    if (!f || !t || f.id === t.id) return;

    const badgeH = 14;
    const badgeW = edge.label ? Math.max(24, Math.ceil(measureTextPx(edge.label, 7.8) + 11)) : 0;

    const railSide = edgeRailSide.get(idx);
    let points: Point[] = [];
    let labelX = (f.cx + t.cx) / 2;
    let labelY = (f.cy + t.cy) / 2;

    if (railSide === 'gutter') {
      const goingRight = t.cx >= f.cx;
      const startX = goingRight ? f.right : f.left;
      const endX = goingRight ? t.left - 3 : t.right + 3;
      const gutterX = (startX + endX) / 2;
      points = [
        { x: startX, y: f.cy },
        { x: gutterX, y: f.cy },
        { x: gutterX, y: t.cy },
        { x: endX, y: t.cy },
      ];
      labelX = gutterX;
      labelY = (f.cy + t.cy) / 2;
    } else if (railSide === 'left' || railSide === 'right') {
      // Upward feedback loop along left or right safe gutter
      if (railSide === 'left') {
        const minNodeLeft = Math.min(...positionedNodes.map((n) => n.left));
        const maxSafeRailX = minNodeLeft - 14 - leftRailCounter * 12;
        const minSafeRailX = Math.max(10, badgeW / 2 + 8);
        const railX = clamp(maxSafeRailX, minSafeRailX, Math.max(minSafeRailX, minNodeLeft - 12));
        leftRailCounter += 1;

        const startX = f.left;
        const endX = t.left - 3;
        points = [
          { x: startX, y: f.cy },
          { x: railX, y: f.cy },
          { x: railX, y: t.cy },
          { x: endX, y: t.cy },
        ];
        labelX = clamp(railX, badgeW / 2 + 6, width - badgeW / 2 - 6);
        labelY = (f.cy + t.cy) / 2;
      } else {
        const maxNodeRight = Math.max(...positionedNodes.map((n) => n.right));
        const minSafeRailX = maxNodeRight + 14 + rightRailCounter * 12;
        const maxSafeRailX = Math.min(width - 10, width - badgeW / 2 - 8);
        const railX = clamp(minSafeRailX, Math.min(maxSafeRailX, maxNodeRight + 12), maxSafeRailX);
        rightRailCounter += 1;

        const startX = f.right;
        const endX = t.right + 3;
        points = [
          { x: startX, y: f.cy },
          { x: railX, y: f.cy },
          { x: railX, y: t.cy },
          { x: endX, y: t.cy },
        ];
        labelX = clamp(railX, badgeW / 2 + 6, width - badgeW / 2 - 6);
        labelY = (f.cy + t.cy) / 2;
      }
    } else if (Math.abs(t.cy - f.cy) <= 10) {
      // Horizontal edge on same row
      const goingRight = t.cx > f.cx;
      const startX = goingRight ? f.right : f.left;
      const endX = goingRight ? t.left - 3 : t.right + 3;
      points = [
        { x: startX, y: f.cy },
        { x: endX, y: t.cy },
      ];
      labelX = (startX + endX) / 2;
      labelY = (f.cy + t.cy) / 2 - 12;
    } else {
      // Downward (or slight upward within adjacent tier) orthogonal connection
      const goingDown = t.cy >= f.cy;
      const outTotal = outgoingDownCount.get(f.id) ?? 1;
      const outIdx = outgoingDownIndex.get(idx) ?? 0;
      const outSpread = outTotal > 1 ? Math.min(f.boxW * 0.45, (outTotal - 1) * 18) : 0;
      const outOffset = outTotal > 1 ? -outSpread / 2 + (outIdx / (outTotal - 1)) * outSpread : 0;

      const inTotal = incomingTopCount.get(t.id) ?? 1;
      const inIdx = incomingTopIndex.get(idx) ?? 0;
      const inSpread = inTotal > 1 ? Math.min(t.boxW * 0.45, (inTotal - 1) * 16) : 0;
      const inOffset = inTotal > 1 ? -inSpread / 2 + (inIdx / (inTotal - 1)) * inSpread : 0;

      const startX = f.cx + outOffset;
      const endX = t.cx + inOffset;
      const startY = goingDown ? f.bottom : f.top;
      const endY = goingDown ? t.top - 3 : t.bottom + 3;

      if (Math.abs(startX - endX) <= 10) {
        const alignedX = (startX + endX) / 2;
        points = [
          { x: alignedX, y: startY },
          { x: alignedX, y: endY },
        ];
        labelX = alignedX;
        labelY = (startY + endY) / 2;
      } else {
        // S-shaped orthogonal elbow
        const targetGroup = groupByNodeId.get(t.id);
        const entryCeiling =
          goingDown && targetGroup && targetGroup.y > startY + 12 ? targetGroup.y - 6 : endY;
        const midY = startY + (entryCeiling - startY) * 0.45;
        points = [
          { x: startX, y: startY },
          { x: startX, y: midY },
          { x: endX, y: midY },
          { x: endX, y: endY },
        ];
        // Place badge cleanly above any group container header or along vertical drop
        if (goingDown && targetGroup && targetGroup.y > startY + 14) {
          labelX = clamp(endX, badgeW / 2 + 6, width - badgeW / 2 - 6);
          labelY = Math.max(startY + badgeH / 2 + 2, targetGroup.y - badgeH / 2 - 3);
        } else {
          const lowerDropMidY = midY + (endY - midY) * 0.5;
          labelX = clamp(endX, badgeW / 2 + 6, width - badgeW / 2 - 6);
          labelY = lowerDropMidY;

          if (Math.abs(endY - midY) < 20) {
            labelX = clamp((startX + endX) / 2, badgeW / 2 + 6, width - badgeW / 2 - 6);
            labelY = midY;
          }
        }
      }
    }

    // Clamp label strictly inside SVG horizontal bounds & adjust slightly if colliding with nodes/group headers/labels
    if (edge.label) {
      labelX = clamp(labelX, badgeW / 2 + 6, width - badgeW / 2 - 6);
      const makeRect = (cx: number, cy: number): Rect => ({
        left: cx - badgeW / 2,
        right: cx + badgeW / 2,
        top: cy - badgeH / 2,
        bottom: cy + badgeH / 2,
      });

      let candidateRect = makeRect(labelX, labelY);
      const hasCollision = (r: Rect) =>
        nodeRects.some((nr) => rectsOverlap(r, nr, 2)) ||
        groupHeaderRects.some((gr) => rectsOverlap(r, gr, 2)) ||
        placedLabelRects.some((lr) => rectsOverlap(r, lr, 2));

      if (hasCollision(candidateRect)) {
        const offsets = [
          { dx: 0, dy: -10 },
          { dx: 0, dy: 10 },
          { dx: 0, dy: -18 },
          { dx: 0, dy: 18 },
          { dx: -16, dy: 0 },
          { dx: 16, dy: 0 },
        ];
        for (const off of offsets) {
          const testX = clamp(labelX + off.dx, badgeW / 2 + 6, width - badgeW / 2 - 6);
          const testY = Math.max(badgeH / 2 + 4, labelY + off.dy);
          const testRect = makeRect(testX, testY);
          if (!hasCollision(testRect)) {
            labelX = testX;
            labelY = testY;
            candidateRect = testRect;
            break;
          }
        }
      }
      placedLabelRects.push(candidateRect);
    }

    routedEdges.push({
      id: `${edge.from}-${edge.to}-${idx}`,
      from: edge.from,
      to: edge.to,
      pathD: buildRoundedOrthogonalPath(points, 6),
      dashed: Boolean(edge.dashed),
      label: edge.label,
      labelX: Number(labelX.toFixed(1)),
      labelY: Number(labelY.toFixed(1)),
      badgeW,
      badgeH,
    });
  });

  // 7. Compute tight bottom height enclosing all nodes, groups, and labels
  const maxNodeBottom = Math.max(...positionedNodes.map((n) => n.bottom));
  const maxGroupBottom =
    positionedGroups.length > 0
      ? Math.max(...positionedGroups.map((g) => g.y + g.height))
      : 0;
  const maxLabelBottom =
    placedLabelRects.length > 0 ? Math.max(...placedLabelRects.map((r) => r.bottom)) : 0;

  const height = Math.max(
    92,
    Math.ceil(Math.max(maxNodeBottom, maxGroupBottom, maxLabelBottom) + 8)
  );

  return {
    width,
    height,
    groups: positionedGroups,
    nodes: positionedNodes,
    edges: routedEdges,
  };
}
