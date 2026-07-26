import type { EffectProvider } from "@/services/providers/types";
import type { RenderContext } from "@/services/render/engine/types";
import type { EffectAsset } from "@/types/asset";
import type { EffectKind } from "@/types/scene";
import { parseHexColor } from "@/utils/color";

/**
 * 1つのエフェクトを描く関数。EffectProvider本体はこれをレジストリから引くだけで、
 * 個々の演出内容を一切知らない。
 */
type EffectRenderer = (
  ctx: CanvasRenderingContext2D,
  asset: EffectAsset,
  width: number,
  height: number,
  tSeconds: number,
) => void;

/**
 * エフェクトのレジストリ。
 * 新しい演出を増やす場合は既存コードを変更せず `registerEffect()` を呼ぶだけでよい
 * （100種類以上への拡張を見込んだ設計）。
 */
const registry = new Map<EffectKind, EffectRenderer>();

export function registerEffect(kind: EffectKind, renderer: EffectRenderer): void {
  registry.set(kind, renderer);
}

/** 決定論的な擬似乱数（同じ入力なら常に同じ値）。フレームごとのチラつきを防ぐ */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

registerEffect("rain", (ctx, asset, width, height, t) => {
  const count = Math.round(40 * asset.intensity);
  ctx.strokeStyle = asset.color;
  ctx.globalAlpha = 0.5 * asset.intensity;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 13.37;
    const x = pseudoRandom(seed) * width;
    const speed = 900 + pseudoRandom(seed + 1) * 400;
    const y = ((t * speed + pseudoRandom(seed + 2) * height) % (height + 40)) - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y + 18);
    ctx.stroke();
  }
});

registerEffect("snow", (ctx, asset, width, height, t) => {
  const count = Math.round(30 * asset.intensity);
  ctx.fillStyle = asset.color;
  ctx.globalAlpha = 0.7 * asset.intensity;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 7.77;
    const speed = 40 + pseudoRandom(seed) * 40;
    const x = width * pseudoRandom(seed + 1) + Math.sin(t + seed) * 18;
    const y = ((t * speed + pseudoRandom(seed + 2) * height) % (height + 20)) - 10;
    const r = 1.5 + pseudoRandom(seed + 3) * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
});

registerEffect("fog", (ctx, asset, width, height) => {
  const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
  gradient.addColorStop(0, hexToRgba(asset.color, 0));
  gradient.addColorStop(1, hexToRgba(asset.color, 0.55 * asset.intensity));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
});

registerEffect("light-rays", (ctx, asset, width, height, t) => {
  const rayCount = 6;
  ctx.globalAlpha = 0.18 * asset.intensity;
  ctx.fillStyle = asset.color;
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (i / rayCount) * Math.PI * 0.6 - Math.PI * 0.3 + Math.sin(t * 0.3) * 0.05;
    const originX = width / 2;
    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(angle);
    ctx.fillRect(-width * 0.05, 0, width * 0.1, height * 1.4);
    ctx.restore();
  }
});

registerEffect("fire", (ctx, asset, width, height, t) => {
  const count = Math.round(18 * asset.intensity);
  for (let i = 0; i < count; i += 1) {
    const seed = i * 5.5;
    const x = width * pseudoRandom(seed) + Math.sin(t * 4 + seed) * 10;
    const life = (t * (60 + pseudoRandom(seed + 1) * 40) + seed * 30) % height;
    const y = height - life;
    const r = 6 + pseudoRandom(seed + 2) * 10 * (1 - life / height);
    ctx.globalAlpha = asset.intensity * (1 - life / height);
    ctx.fillStyle = i % 2 === 0 ? "#FF6A2B" : asset.color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    ctx.fill();
  }
});

registerEffect("particles", (ctx, asset, width, height, t) => {
  const count = Math.round(24 * asset.intensity);
  ctx.fillStyle = asset.color;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 3.3;
    const speed = 20 + pseudoRandom(seed) * 30;
    const x = width * pseudoRandom(seed + 1) + Math.sin(t * 0.5 + seed) * 12;
    const y = ((height - t * speed) % (height + 20) + height + 20) % (height + 20);
    ctx.globalAlpha = 0.6 * asset.intensity;
    ctx.beginPath();
    ctx.arc(x, y, 2 + pseudoRandom(seed + 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
});

registerEffect("cherry-blossom", (ctx, asset, width, height, t) => {
  const count = Math.round(20 * asset.intensity);
  for (let i = 0; i < count; i += 1) {
    const seed = i * 9.1;
    const speed = 30 + pseudoRandom(seed) * 25;
    const sway = Math.sin(t * 1.2 + seed) * 20;
    const x = width * pseudoRandom(seed + 1) + sway;
    const y = ((t * speed + pseudoRandom(seed + 2) * height) % (height + 20)) - 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t + seed);
    ctx.globalAlpha = 0.8 * asset.intensity;
    ctx.fillStyle = asset.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
});

registerEffect("lightning", (ctx, asset, width, height, t) => {
  // 数秒に一度、短時間だけ発光する（決定論的なタイミング）
  const cyclePosition = (t * 0.7) % 3;
  const isFlashing = cyclePosition < 0.08;
  if (!isFlashing) return;

  ctx.globalAlpha = asset.intensity * (1 - cyclePosition / 0.08) * 0.8;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = asset.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let x = width * 0.5;
  ctx.moveTo(x, 0);
  for (let y = 0; y < height; y += height / 8) {
    x += (pseudoRandom(y + t) - 0.5) * 40;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
});

registerEffect("noise", (ctx, asset, width, height, t) => {
  const count = Math.round(120 * asset.intensity);
  ctx.fillStyle = asset.color;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 1.618 + Math.floor(t * 24);
    ctx.globalAlpha = pseudoRandom(seed) * 0.15;
    ctx.fillRect(pseudoRandom(seed + 1) * width, pseudoRandom(seed + 2) * height, 2, 2);
  }
});

registerEffect("vignette", (ctx, asset, width, height) => {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    height * 0.75,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, hexToRgba("#000000", 0.55 * asset.intensity));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
});

registerEffect("sparkle", (ctx, asset, width, height, t) => {
  const count = Math.round(16 * asset.intensity);
  ctx.fillStyle = asset.color;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 4.2;
    const twinkle = Math.max(0, Math.sin(t * 2 + seed * 3));
    const x = width * pseudoRandom(seed);
    const y = height * pseudoRandom(seed + 1);
    ctx.globalAlpha = twinkle * asset.intensity;
    const r = 2 + twinkle * 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.strokeStyle = asset.color;
    ctx.stroke();
  }
});

registerEffect("bokeh", (ctx, asset, width, height, t) => {
  const count = Math.round(10 * asset.intensity);
  for (let i = 0; i < count; i += 1) {
    const seed = i * 6.6;
    const x = width * pseudoRandom(seed) + Math.sin(t * 0.2 + seed) * 15;
    const y = height * pseudoRandom(seed + 1) + Math.cos(t * 0.15 + seed) * 15;
    const r = height * (0.04 + pseudoRandom(seed + 2) * 0.05);
    ctx.globalAlpha = 0.2 * asset.intensity;
    ctx.fillStyle = asset.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
});

registerEffect("halftone", (ctx, asset, width, height) => {
  const spacing = Math.max(8, Math.round(height * 0.02));
  ctx.fillStyle = asset.color;
  ctx.globalAlpha = 0.25 * asset.intensity;
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, spacing * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
});

registerEffect("speed-lines", (ctx, asset, width, height, t) => {
  const count = 14;
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = asset.color;
  ctx.globalAlpha = 0.35 * asset.intensity;
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + t * 0.5;
    const innerR = height * 0.3;
    const outerR = height * 0.75;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }
});

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** シーンに割り当てられたエフェクトを順番に描く。カメラの影響を受けない画面固定オーバーレイ */
export const localEffectProvider: EffectProvider = {
  kind: "effect",
  id: "local-effect",
  stage: "foreground",
  draw({ ctx, scene, width, height, tSeconds, directorCue }: RenderContext) {
    for (const effect of scene.effects) {
      const renderer = registry.get(effect.variant);
      if (!renderer) continue;
      const scaledEffect = {
        ...effect,
        intensity: Math.max(0, Math.min(1, effect.intensity * directorCue.effectIntensity)),
      };
      ctx.save();
      renderer(ctx, scaledEffect, width, height, tSeconds);
      ctx.restore();
    }
  },
};
