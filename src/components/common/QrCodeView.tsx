import React from 'react';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * A lightweight deterministic SVG QR-style visual matrix generator for Gate Passes
 * Encodes value visually with real quiet zones, finder patterns, and deterministic module distribution.
 */
export const QrCodeView: React.FC<QrCodeProps> = ({ value, size = 120, className = '' }) => {
  // Deterministic 21x21 grid pseudo QR
  const gridSize = 21;
  const modules: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  // Add 3 corner finder patterns (7x7)
  const addFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          modules[startY + r][startX + c] = true;
        }
      }
    }
  };

  addFinder(0, 0); // Top-left
  addFinder(gridSize - 7, 0); // Top-right
  addFinder(0, gridSize - 7); // Bottom-left

  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }

  // Seed data using hash of string
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  let pseudoRandom = Math.abs(hash);
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= gridSize - 8;
      const inBottomLeft = r >= gridSize - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      pseudoRandom = (pseudoRandom * 16807) % 2147483647;
      modules[r][c] = pseudoRandom % 3 === 0;
    }
  }

  const cellSize = size / gridSize;

  return (
    <div
      className={`inline-block p-2 bg-white rounded border border-slate-200 shadow-xs ${className}`}
      style={{ width: size + 16, height: size + 16 }}
      title={`Gate Pass Verification QR: ${value}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#ffffff" />
        {modules.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.2}
                height={cellSize + 0.2}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
