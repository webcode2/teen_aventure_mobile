import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

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

/**
 * Passes are web links so any phone camera can open them. The Cloudflare Worker
 * redirects /join/* to Google Play; the in-app scanner reads the code.
 */
const JOIN_LINK_BASE = 'https://tba.elastrocloud.com/join';

export function churchJoinQrPayload(joinCode: string) {
  const code = (joinCode || '').trim().toUpperCase();
  return `${JOIN_LINK_BASE}/church/${encodeURIComponent(code)}`;
}

export function classJoinQrPayload(joinCode: string) {
  const code = (joinCode || '').trim().toUpperCase();
  return `${JOIN_LINK_BASE}/class/${encodeURIComponent(code)}`;
}

export function joinPassQrPayload(kind: 'church' | 'class', joinCode: string) {
  return kind === 'class' ? classJoinQrPayload(joinCode) : churchJoinQrPayload(joinCode);
}

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
      height={renderHeight}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Barcode for ${value}`}
    >
      <rect x="0" y="0" width={totalWidth} height={renderHeight} fill={bgColor} rx="4" />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={8} width={r.width} height={height - 8} fill={barColor} />
      ))}
      {showText ? (
        <text
          x={totalWidth / 2}
          y={height + 14}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          fontSize="12"
          fontWeight="700"
          fill={barColor}
          letterSpacing="2"
        >
          {code}
        </text>
      ) : null}
    </svg>
  );
}

/**
 * Real scannable QR (ISO/IEC 18004) rendered as SVG.
 */
export function QrCodeSvg({
  value,
  size = 180,
  className = '',
  fgColor = '#011f3b',
  bgColor = '#ffffff',
}: {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    QRCode.toString(value, {
      type: 'svg',
      margin: 2,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: fgColor, light: bgColor },
    })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : 'Could not build QR');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, fgColor, bgColor]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-cream text-center text-[11px] text-muted ${className}`}
        style={{ width: size, height: size }}
        role="alert"
      >
        QR unavailable
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={`rounded-lg bg-surface-2 animate-pulse ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`select-none overflow-hidden rounded-lg ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QR Code for ${value}`}
      // qrcode emits a trusted local SVG string for the given value
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Interactive join pass card (ministry or class group) with format toggle,
 * copy-to-clipboard, share, and print-ready presentation.
 */
export function JoinPassCard({
  joinCode,
  name,
  description,
  badge,
  passKind = 'church',
  kicker,
  instructions,
  compact = false,
}: {
  joinCode: string;
  name: string;
  description?: string;
  badge?: string;
  passKind?: 'church' | 'class';
  kicker?: string;
  instructions?: string;
  /** Smaller graphic under page labels — no title chrome or print/share row. */
  compact?: boolean;
}) {
  const [format, setFormat] = useState<'barcode' | 'qr'>('qr');
  const [copied, setCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const cleanCode = (joinCode || 'FAITH52').toUpperCase();
  const qrPayload = joinPassQrPayload(passKind, cleanCode);
  const passLabel = passKind === 'class' ? 'Group study pass' : 'Family & group study pass';
  const helpText =
    instructions ??
    (passKind === 'class'
      ? 'Explorers scan this pass with their phone camera or in the Teen Bible Adventures app, or enter the group code to join.'
      : 'Visiting families scan this pass with their phone camera or in the Teen Bible Adventures app, or enter the code during family profile setup.');

  function copyCode() {
    navigator.clipboard.writeText(cleanCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function sharePass() {
    setShareBusy(true);
    try {
      const shareData = {
        title: `${name} join pass`,
        text: `Join ${name} on Teen Bible Adventures with code ${cleanCode}`,
        url: qrPayload,
      };
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${qrPayload}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share sheet — ignore
    } finally {
      setShareBusy(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (compact) {
    return (
      <div className="flex w-full max-w-[14rem] flex-col items-stretch gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-cream p-0.5 text-[10px]">
            <button
              type="button"
              className={`cursor-pointer rounded-md px-2 py-1 font-bold transition-all ${
                format === 'barcode' ? 'bg-navy text-white' : 'text-muted hover:text-navy'
              }`}
              onClick={() => setFormat('barcode')}
            >
              1D
            </button>
            <button
              type="button"
              className={`cursor-pointer rounded-md px-2 py-1 font-bold transition-all ${
                format === 'qr' ? 'bg-navy text-white' : 'text-muted hover:text-navy'
              }`}
              onClick={() => setFormat('qr')}
            >
              2D
            </button>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="cursor-pointer text-[10px] font-bold text-teal hover:text-teal/80"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-border/80 bg-white p-2.5">
          {format === 'barcode' ? (
            <BarcodeSvg value={cleanCode} width={180} height={44} showText={true} />
          ) : (
            <QrCodeSvg value={qrPayload} size={96} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-surface border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between w-full pb-3 border-b border-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal">
            {kicker ?? passLabel}
          </span>
          <h4 className="text-base sm:text-lg font-extrabold text-navy truncate" title={name}>
            {name}
          </h4>
          {description ? (
            <p className="mt-0.5 max-w-xs text-xs leading-snug text-muted line-clamp-2" title={description}>
              {description}
            </p>
          ) : null}
        </div>
        {badge ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-navy/5 text-navy border border-border">
            {badge}
          </span>
        ) : null}
      </div>

      {/* Code Display & Toggle Bar */}
      <div className="flex items-center justify-between w-full mt-3.5">
        <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-lg border border-border text-xs sm:text-sm">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              format === 'barcode' ? 'bg-navy text-white shadow-2xs' : 'text-muted hover:text-navy'
            }`}
            onClick={() => setFormat('barcode')}
          >
            1D Barcode
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
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
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-teal hover:text-teal/80 transition-colors cursor-pointer"
        >
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Scannable Graphic Card */}
      <div className="my-5 p-4 rounded-xl bg-white border border-border/80 shadow-inner flex flex-col items-center justify-center min-h-[140px] w-full">
        {format === 'barcode' ? (
          <div className="flex flex-col items-center gap-2">
            <BarcodeSvg value={cleanCode} width={290} height={70} showText={true} />
            <span className="text-[10px] text-muted text-center">
              Scanners read the join code. Phones: prefer the 2D QR tab.
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <QrCodeSvg value={qrPayload} size={160} />
            <span className="text-xs font-mono font-bold text-navy tracking-widest mt-1">
              JOIN CODE: {cleanCode}
            </span>
          </div>
        )}
      </div>

      {/* Instructions & Actions */}
      <p className="text-xs sm:text-sm text-text-2 text-center leading-relaxed">
        {helpText} Code:{' '}
        <strong className="text-navy font-bold font-mono tracking-wide">{cleanCode}</strong>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full mt-4 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs sm:text-sm font-semibold text-navy transition-colors cursor-pointer"
        >
          <span>Print pass</span>
        </button>
        <button
          type="button"
          onClick={() => void sharePass()}
          disabled={shareBusy}
          className="flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-teal/30 bg-teal-tint hover:bg-teal/15 text-xs sm:text-sm font-semibold text-teal transition-colors cursor-pointer disabled:opacity-60"
        >
          <span>{shareBusy ? 'Sharing…' : 'Share QR'}</span>
        </button>
        <button
          type="button"
          onClick={copyCode}
          className="flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-navy hover:bg-teal text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <span>{copied ? '✓ Copied' : 'Copy code'}</span>
        </button>
      </div>
    </div>
  );
}

/** @deprecated Prefer JoinPassCard — kept for existing ministry call sites. */
export function ChurchJoinBarcodeCard({
  joinCode,
  churchName,
  description,
  jurisdiction,
}: {
  joinCode: string;
  churchName: string;
  description?: string;
  jurisdiction?: string;
}) {
  return (
    <JoinPassCard
      joinCode={joinCode}
      name={churchName}
      description={description}
      badge={jurisdiction}
      passKind="church"
    />
  );
}

export function GroupJoinBarcodeCard({
  joinCode,
  groupName,
  description,
  kind,
  compact = false,
}: {
  joinCode: string;
  groupName: string;
  description?: string;
  kind?: string;
  compact?: boolean;
}) {
  return (
    <JoinPassCard
      joinCode={joinCode}
      name={groupName}
      description={description}
      badge={kind}
      passKind="class"
      kicker="Group join pass"
      compact={compact}
    />
  );
}

/** Compact QR under group labels, with share / print / copy-link actions. */
export function GroupJoinPassImages({
  joinCode,
  groupName,
  className = '',
}: {
  joinCode: string;
  groupName?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);

  const cleanCode = (joinCode || '').trim().toUpperCase();
  const qrPayload = cleanCode ? classJoinQrPayload(cleanCode) : '';
  const label = (groupName || 'Group').trim() || 'Group';

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyLink() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      flashCopied();
    } catch {
      /* ignore */
    }
  }

  async function shareQr() {
    if (!qrPayload) return;
    setShareBusy(true);
    try {
      const shareData = {
        title: `${label} join pass`,
        text: `Join ${label} on Teen Bible Adventures`,
        url: qrPayload,
      };
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(qrPayload);
        flashCopied();
      }
    } catch {
      // User cancelled share sheet
    } finally {
      setShareBusy(false);
    }
  }

  /** Print window contains only the QR image — nothing else. */
  async function printQrOnly() {
    if (!qrPayload) return;
    setPrintBusy(true);
    try {
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 2,
        width: 512,
        errorCorrectionLevel: 'M',
        color: { dark: '#011f3b', light: '#ffffff' },
      });
      const win = window.open('', '_blank', 'noopener,noreferrer,width=640,height=720');
      if (!win) return;
      win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page { margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #fff;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      width: 70vmin;
      max-width: 512px;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="" />
  <script>
    const img = document.querySelector('img');
    function go() {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 50);
    }
    if (img.complete) go();
    else img.onload = go;
    window.onafterprint = function () { window.close(); };
  <\/script>
</body>
</html>`);
      win.document.close();
    } catch {
      /* ignore */
    } finally {
      setPrintBusy(false);
    }
  }

  if (!cleanCode) return null;

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <div
        className="rounded-lg border border-border/70 bg-white p-1.5 shadow-2xs"
        aria-label={`Join QR for ${cleanCode}`}
      >
        <QrCodeSvg value={qrPayload} size={72} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => void shareQr()}
          disabled={shareBusy}
          className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-teal hover:underline disabled:opacity-60"
        >
          {shareBusy ? 'Sharing…' : 'Share'}
        </button>
        <button
          type="button"
          onClick={() => void printQrOnly()}
          disabled={printBusy}
          className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-teal hover:underline disabled:opacity-60"
        >
          {printBusy ? 'Preparing…' : 'Print'}
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-teal hover:underline"
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
