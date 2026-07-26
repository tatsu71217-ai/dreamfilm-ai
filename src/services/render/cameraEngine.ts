import type { CameraMotion } from "@/types/scene";

/** ある時点でのカメラ変換。Canvasの座標変換にそのまま適用する */
export interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
  /** ラジアン */
  rotate: number;
}

const IDENTITY: CameraTransform = { scale: 1, translateX: 0, translateY: 0, rotate: 0 };

/** 背景レイヤーは前景より控えめに動かすことで奥行き（視差）を出す */
const BACKGROUND_PARALLAX_RATIO = 0.4;

/**
 * カメラワークを時点tに応じた変換へ計算する。
 * progress は 0〜1（シーン内での経過割合）。
 */
export function computeCameraTransform(
  motion: CameraMotion,
  progress: number,
  width: number,
  height: number,
): CameraTransform {
  const p = clamp01(progress);

  switch (motion) {
    case "zoom-in":
      return { ...IDENTITY, scale: 1 + 0.16 * p };
    case "zoom-out":
      return { ...IDENTITY, scale: 1.16 - 0.16 * p };
    case "pan-left":
      return { ...IDENTITY, translateX: -width * 0.08 * p };
    case "pan-right":
      return { ...IDENTITY, translateX: width * 0.08 * p };
    case "pan-up":
      return { ...IDENTITY, translateY: -height * 0.08 * p };
    case "pan-down":
      return { ...IDENTITY, translateY: height * 0.08 * p };
    case "rotate":
      return { ...IDENTITY, rotate: (p - 0.5) * 0.06, scale: 1.04 };
    case "parallax":
      return { ...IDENTITY, translateX: width * 0.12 * (p - 0.5), scale: 1.06 };
    case "drift":
      return {
        ...IDENTITY,
        translateX: width * 0.03 * Math.sin(p * Math.PI * 2),
        translateY: height * 0.02 * Math.cos(p * Math.PI * 1.3),
        scale: 1.03,
      };
    case "shake": {
      // 決定論的な疑似乱数（tから算出）で高周波の小刻みな揺れを作る
      const jitter = (freq: number) => Math.sin(p * Math.PI * freq) * 0.5 + Math.sin(p * Math.PI * freq * 2.7) * 0.5;
      return {
        ...IDENTITY,
        translateX: width * 0.012 * jitter(37),
        translateY: height * 0.008 * jitter(29),
      };
    }
    case "still":
    default:
      return IDENTITY;
  }
}

/** 背景レイヤー用に、前景の変換を控えめにスケールする（視差効果） */
export function scaleForParallaxBackground(transform: CameraTransform): CameraTransform {
  return {
    scale: 1 + (transform.scale - 1) * BACKGROUND_PARALLAX_RATIO,
    translateX: transform.translateX * BACKGROUND_PARALLAX_RATIO,
    translateY: transform.translateY * BACKGROUND_PARALLAX_RATIO,
    rotate: transform.rotate * BACKGROUND_PARALLAX_RATIO,
  };
}

/** ctx.transform 相当の変換をCanvasへ適用する（呼び出し側で ctx.save/restore すること） */
export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  transform: CameraTransform,
  width: number,
  height: number,
): void {
  ctx.translate(width / 2 + transform.translateX, height / 2 + transform.translateY);
  ctx.rotate(transform.rotate);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-width / 2, -height / 2);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
