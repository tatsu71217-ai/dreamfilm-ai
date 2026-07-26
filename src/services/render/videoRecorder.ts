import { drawScene } from "@/services/render/canvasSceneRenderer";
import type { DreamScene } from "@/types/scene";

/** Canvas描画をMediaRecorderでWebMへキャプチャする（Phase5最小スパイク） */
export async function renderScenesToWebm(
  scenes: DreamScene[],
  width: number,
  height: number,
  fps: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D コンテキストを取得できませんでした。");

  const totalSeconds = scenes[scenes.length - 1]?.endTime ?? 0;
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  const frameIntervalMs = 1000 / fps;
  const startedAt = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      if (elapsedSeconds >= totalSeconds) {
        resolve();
        return;
      }
      const scene = scenes.find((s) => elapsedSeconds >= s.startTime && elapsedSeconds < s.endTime) ?? scenes[scenes.length - 1];
      drawScene(ctx, scene, width, height, elapsedSeconds - scene.startTime);
      setTimeout(tick, frameIntervalMs);
    };
    tick();
  });

  recorder.stop();
  await stopped;

  return new Blob(chunks, { type: "video/webm" });
}
