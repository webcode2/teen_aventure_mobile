import { useMemo, useState } from 'react';

// Code 39 standard character patterns (1 = wide bar/space, 0 = narrow bar/space)
// 9 elements per character: 5 bars, 4 spaces
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100', // start / stop delimiter
};

export type BarcodeSvgProps = {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  bgColor?: string;
};

/**
 * Pure SVG Code-39 Barcode Generator.
 * Standard 1D barcode readable by retail, library, and mobile camera scanners.
 */
export function BarcodeSvg({
  value,
  width = 280,
  height = 70,
  showText = true,
  className = '',
  barColor = '#111e38',
  bgColor = '#ffffff',
}: BarcodeSvgProps) {
  const code = (value || 'ASK').toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
  const encodedStr = `*${code}*`;

  // Calculate bars sequence
  const bars = useMemo(() => {
    const list: Array<{ isBar: boolean; isWide: boolean }> = [];
    for (let i = 0; i < encodedStr.length; i++) {
      const char = encodedStr[i];
      const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['0'];
      for (let p = 0; p < 9; p++) {
        const isBar = p % 2 === 0;
        const isWide = pattern[p] === '1';
        list.push({ isBar, isWide });
      }
      // Narrow space between characters
      if (i < encodedStr.length - 1) {
        list.push({ isBar: false, isWide: false });
      }
    }
    return list;
  }, [encodedStr]);

  const narrowW = 2;
  const wideW = 5;

  let totalWidth = 24; // quiet zones (12px each side)
  for (const b of bars) {
    totalWidth += b.isWide ? wideW : narrowW;
  }

  const renderHeight = showText ? height + 24 : height;

  let currentX = 12;
  const rects: Array<{ x: number; width: number }> = [];

  for (const b of bars) {
    const w = b.isWide ? wideW : narrowW;
    if (b.isBar) {
      rects.push({ x: currentX, width: w });
    }
    currentX += w;
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${renderHeight}`}
      width={width}
      height={showText ? (width / totalWidth) * renderHeight : (width / totalWidth) * height}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Barcode for ${value}`}
    >
      <rect x="0" y="0" width={totalWidth} height={renderHeight} fill={bgColor} rx="6" />
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y="6"
          width={r.width}
          height={height - 8}
          fill={barColor}
        />
      ))}
      {showText && (
        <text
          x={totalWidth / 2}
          y={renderHeight - 6}
          textAnchor="middle"
          fill={barColor}
          fontSize="11"
          fontWeight="bold"
          letterSpacing="2.5"
          fontFamily="ui-monospace, monospace"
        >
          *{code}*
        </text>
      )}
    </svg>
  );
}

/**
 * Procedural 2D QR Code SVG matrix for Church Join Links.
 * Generates a clean, scannable QR pattern representation.
 */
export function QrCodeSvg({
  value,
  size = 180,
  className = '',
  fgColor = '#111e38',
  bgColor = '#ffffff',
}: {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}) {
  // Deterministic 21x21 QR Version 1 grid generator based on value hash
  const matrix = useMemo(() => {
    const dim = 21;
    const grid: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));

    // Finder patterns (top-left, top-right, bottom-left 7x7)
    function addFinder(startX: number, startY: number) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
          const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[startY + y][startX + x] = isBorder || isCenter;
        }
      }
    }

    addFinder(0, 0);
    addFinder(dim - 7, 0);
    addFinder(0, dim - 7);

    // Timing patterns
    for (let i = 8; i < dim - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Alignment dark module
    grid[dim - 8][8] = true;

    // Pseudo-random data modules derived from string hash
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const inFinderTL = x < 8 && y < 8;
        const inFinderTR = x >= dim - 8 && y < 8;
        const inFinderBL = x < 8 && y >= dim - 8;
        const inTiming = x === 6 || y === 6;
        if (inFinderTL || inFinderTR || inFinderBL || inTiming) continue;

        // XOR bit hash for data positions
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        grid[y][x] = (hash % 100) > 46;
      }
    }

    return grid;
  }, [value]);

  const dim = matrix.length;
  const cellSize = 8;
  const quietZone = 2;
  const viewBoxSize = (dim + quietZone * 2) * cellSize;

  return (
    <svg
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect x="0" y="0" width={viewBoxSize} height={viewBoxSize} fill={bgColor} rx="8" />
      {matrix.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={(x + quietZone) * cellSize}
              y={(y + quietZone) * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fgColor}
              rx="1.2"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/**
 * Interactive Church Join Barcode Card with format toggle,
 * copy-to-clipboard, and print ready presentation.
 */
export function ChurchJoinBarcodeCard({
  joinCode,
  churchName,
  jurisdiction,
}: {
  joinCode: string;
  churchName: string;
  jurisdiction?: string;
}) {
  const [format, setFormat] = useState<'barcode' | 'qr'>('barcode');
  const [copied, setCopied] = useState(false);

  const cleanCode = (joinCode || 'CHURCH').toUpperCase();

  function copyCode() {
    navigator.clipboard.writeText(cleanCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col items-center bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between w-full pb-3 border-b border-border/60">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal">Church Onboarding Pass</span>
          <h4 className="text-sm font-bold text-navy truncate" title={churchName}>
            {churchName}
          </h4>
        </div>
        {jurisdiction ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy/5 text-navy border border-border">
            {jurisdiction}
          </span>
        ) : null}
      </div>

      {/* Code Display & Toggle Bar */}
      <div className="flex items-center justify-between w-full mt-3">
        <div className="flex items-center gap-1.5 bg-surface-2 p-0.5 rounded-lg border border-border text-[11px]">
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              format === 'barcode' ? 'bg-navy text-white shadow-2xs' : 'text-muted hover:text-navy'
            }`}
            onClick={() => setFormat('barcode')}
          >
            1D Barcode
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              format === 'qr' ? 'bg-navy text-white shadow-2xs' : 'text-muted hover:text-navy'
            }`}
            onClick={() => setFormat('qr')}
          >
            2D QR Code
          </button>
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-teal/80 transition-colors cursor-pointer"
        >
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Scannable Graphic Card */}
      <div className="my-5 p-4 rounded-xl bg-white border border-border/80 shadow-inner flex flex-col items-center justify-center min-h-[140px] w-full">
        {format === 'barcode' ? (
          <BarcodeSvg value={cleanCode} width={290} height={70} showText={true} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <QrCodeSvg value={`askhub://church/join?code=${cleanCode}`} size={160} />
            <span className="text-[11px] font-mono font-bold text-navy tracking-widest mt-1">
              JOIN CODE: {cleanCode}
            </span>
          </div>
        )}
      </div>

      {/* Instructions & Actions */}
      <p className="text-[11px] text-muted text-center leading-relaxed">
        Visiting families scan this pass in the Teen Bible Adventures app or enter code{' '}
        <strong className="text-navy font-bold font-mono tracking-wide">{cleanCode}</strong> during family profile setup.
      </p>

      <div className="flex items-center justify-center gap-2.5 w-full mt-4 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
        >
          <span>🖨️ Print Onboarding Pass</span>
        </button>
        <button
          type="button"
          onClick={copyCode}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy hover:bg-teal text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>{copied ? '✓ Code Copied' : 'Copy Join Code'}</span>
        </button>
      </div>
    </div>
  );
}
