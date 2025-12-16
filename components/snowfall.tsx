"use client";

import React, { useEffect, useRef } from "react";

interface Snowflake {
  x: number;
  y: number;
  size: number;
  velY: number;
  opacity: number;
}

/**
 * Snowfall overlay using Canvas API with accumulation at bottom and on form area.
 * Visual style still matches previous ❄ look (circles/soft dots).
 */
export function SnowfallOverlay({
  snowflakeCount = 180,
  maxSnowHeight = 200,
  // Soft white-blue snow color
  color = "#ADD8E6",
  formSelector = "[data-login-form]",
}: {
  snowflakeCount?: number;
  maxSnowHeight?: number;
  color?: string;
  formSelector?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const snowflakesRef = useRef<Snowflake[]>([]);
  const snowPileRef = useRef<number[]>([]);
  const formPileRef = useRef<number[]>([]);
  const formRectRef = useRef<DOMRect | null>(null);
  const mouseXRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const resetSnowflake = (flake: Snowflake) => {
      flake.x = Math.random() * width;
      flake.y = Math.random() * -height;
      // Bigger base size for more visible snowflakes
      flake.size = Math.random() * 4 + 3; // 3px - 7px base
      flake.velY = Math.random() * 1.2 + 1.2;
      flake.opacity = Math.random() * 0.5 + 0.35;
    };

    snowPileRef.current = new Array(width).fill(0);
    formPileRef.current = new Array(width).fill(0);
    snowflakesRef.current = [];
    for (let i = 0; i < snowflakeCount; i++) {
      const f = { x: 0, y: 0, size: 0, velY: 0, opacity: 1 };
      resetSnowflake(f);
      snowflakesRef.current.push(f);
    }

    const updateFormRect = () => {
      const el = document.querySelector(formSelector);
      formRectRef.current = el ? el.getBoundingClientRect() : null;
    };
    updateFormRect();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      snowPileRef.current = new Array(width).fill(0);
      formPileRef.current = new Array(width).fill(0);
      updateFormRect();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updateFormRect);

    // Mouse interactions for clearing snow (no click required)
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const rangeSpread = 3;

    const update = () => {
      ctx.clearRect(0, 0, width, height);

      // Clear snow around cursor whenever mouse moves
      if (mouseXRef.current !== null) {
        const brushRadius = 30; // px
        const centerX = mouseXRef.current;
        const startX = Math.max(0, Math.floor(centerX - brushRadius));
        const endX = Math.min(width - 1, Math.ceil(centerX + brushRadius));

        for (let x = startX; x <= endX; x++) {
          const dist = Math.abs(x - centerX);
          const factor = 1 - dist / brushRadius; // 1 at center, 0 at edge
          if (factor <= 0) continue;

          const amount = 6 * factor; // how much to clear
          snowPileRef.current[x] = Math.max(0, (snowPileRef.current[x] || 0) - amount);
          formPileRef.current[x] = Math.max(0, (formPileRef.current[x] || 0) - amount);
        }
      }

      // Draw bottom pile
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x < width; x++) {
        ctx.lineTo(x, height - snowPileRef.current[x]);
      }
      ctx.lineTo(width, height);
      ctx.fill();

      // Draw form pile if form exists
      const formRect = formRectRef.current;
      if (formRect) {
        ctx.beginPath();
        for (let x = Math.max(0, Math.floor(formRect.left)); x < Math.min(width, Math.ceil(formRect.right)); x++) {
          const pile = formPileRef.current[x] || 0;
          const yTop = formRect.top - pile;
          ctx.rect(x, yTop, 1, pile);
        }
        ctx.fill();
      }

      // Snowflakes
      for (let i = 0; i < snowflakesRef.current.length; i++) {
        const f = snowflakesRef.current[i];
        f.x += Math.sin(f.y * 0.04) * 0.5;
        f.y += f.velY;

        // keep in bounds X
        if (f.x < 0) f.x = 0;
        if (f.x > width - 1) f.x = width - 1;
        const xi = Math.floor(f.x);

        let collided = false;

        // Check collision with bottom pile
        if (f.y >= height - snowPileRef.current[xi]) {
          if (snowPileRef.current[xi] < maxSnowHeight) {
            for (let k = -rangeSpread; k <= rangeSpread; k++) {
              const nx = xi + k;
              if (nx >= 0 && nx < width) snowPileRef.current[nx] += f.size * 0.4;
            }
          }
          collided = true;
        }

        // Check collision with form pile
        if (!collided && formRect) {
          const formLeft = Math.floor(formRect.left);
          const formRight = Math.ceil(formRect.right);
          if (xi >= formLeft && xi <= formRight) {
            const formPile = formPileRef.current[xi] || 0;
            const formTop = formRect.top - formPile;
            if (f.y >= formTop && f.y <= formRect.bottom) {
              const spillMargin = 8; // px near edge will spill off
              const nearEdge = xi < formLeft + spillMargin || xi > formRight - spillMargin;

              if (nearEdge) {
                // Spill to bottom pile when landing near edges of form
                if (snowPileRef.current[xi] < maxSnowHeight) {
                  for (let k = -rangeSpread; k <= rangeSpread; k++) {
                    const nx = xi + k;
                    if (nx >= 0 && nx < width) snowPileRef.current[nx] += f.size * 0.35;
                  }
                }
              } else {
                // Accumulate on top of form
                for (let k = -rangeSpread; k <= rangeSpread; k++) {
                  const nx = xi + k;
                  if (nx >= 0 && nx < width) formPileRef.current[nx] += f.size * 0.35;
                }
              }

              collided = true;
            }
          }
        }

        if (collided) {
          resetSnowflake(f);
        }

        // draw flake as ❄ glyph
        ctx.fillStyle = color;
        ctx.globalAlpha = f.opacity;
        const fontSize = f.size * 5; // scale up for bigger snowflakes
        ctx.font = `${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("❄", f.x, f.y);
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updateFormRect);
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [snowflakeCount, maxSnowHeight, color, formSelector]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

