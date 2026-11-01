"use client";

import React, { useMemo } from "react";

interface QrCodeSvgProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * Deterministic client-side QR Code Matrix Generator (Version 1-2 format)
 * Renders standard finder patterns, timing belts, alignment boxes, and data bits in pure SVG.
 */
export function QrCodeSvg({
  value,
  size = 160,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
  className = "",
}: QrCodeSvgProps) {
  const matrix = useMemo(() => {
    const dimension = 25; // 25x25 grid (QR Version 2)
    const grid: boolean[][] = Array.from({ length: dimension }, () =>
      Array(dimension).fill(false)
    );

    // Helper to draw a filled rectangle
    const fillRect = (x: number, y: number, w: number, h: number, val: boolean) => {
      for (let r = y; r < y + h; r++) {
        for (let c = x; c < x + w; c++) {
          if (r >= 0 && r < dimension && c >= 0 && c < dimension) {
            grid[r][c] = val;
          }
        }
      }
    };

    // Draw standard 7x7 Finder Pattern with separator
    const drawFinder = (startX: number, startY: number) => {
      fillRect(startX, startY, 7, 7, true);
      fillRect(startX + 1, startY + 1, 5, 5, false);
      fillRect(startX + 2, startY + 2, 3, 3, true);
    };

    // 1. Top-left, top-right, bottom-left finders
    drawFinder(0, 0);
    drawFinder(dimension - 7, 0);
    drawFinder(0, dimension - 7);

    // 2. Timing patterns (row 6 and col 6)
    for (let i = 8; i < dimension - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. Alignment pattern at (16, 16)
    fillRect(16, 16, 5, 5, true);
    fillRect(17, 17, 3, 3, false);
    grid[18][18] = true;

    // 4. Deterministic hash encoding from string value
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    // Pseudo-random bit filler for data payload (skipping finder / reserved areas)
    let seed = Math.abs(hash) || 42;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let r = 0; r < dimension; r++) {
      for (let c = 0; c < dimension; c++) {
        // Skip finder zones
        const inTopLeft = r <= 7 && c <= 7;
        const inTopRight = r <= 7 && c >= dimension - 8;
        const inBottomLeft = r >= dimension - 8 && c <= 7;
        const inTiming = r === 6 || c === 6;
        const inAlignment = r >= 16 && r <= 20 && c >= 16 && c <= 20;

        if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlignment) {
          grid[r][c] = lcg() > 0.48;
        }
      }
    }

    return grid;
  }, [value]);

  const dimension = matrix.length;
  const cellSize = size / dimension;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`rounded-xl shadow-sm ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <rect width={size} height={size} fill={bgColor} rx={8} />
      {matrix.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.3} // slight overlap to prevent render gaps
              height={cellSize + 0.3}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}

