import type { AudioTrackHandle } from "@/services/render/engine/audioEngine";
import { drawScene } from "@/services/render/canvasSceneRenderer";
import type { DreamScene } from "@/types/scene";

/**
 * MediaRecorderが対応するコンテナ形式を優先順に判定する。
 *
 * iPhone/iPad Safari（iOS版含む）は WebM を一切サポートしない
 * （MediaRecorderでの録画・<video>での再生のいずれも不可）。
 * 「スマホ優先」「iPhone Safariで再生・保存できること」という要件のため、
 * ハードコードせずランタイムで対応形式を検出し、Safari系ではMP4(H.264)を使う。
 */
const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType(): string {
  for (const mimeType of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  throw new Error(
    "この端末・ブラウザは動画の録画（MediaRecorder）に対応していません。",
  );
}

/**
 * Canvas描画をMediaRecorderで録画し、端末が対応する形式（MP4/WebM）の動画Blobを返す。
 *
 * `audioTrack` を渡すと映像トラックと合成して録画する（省略/nullの場合は無音の動画になる）。
 * 音声トラックの生成はDirectorEngine.planAudio()の責務であり、videoRecorderは
 * AudioProviderを直接呼び出さない（既に出来上がったトラックを受け取るだけ）。
 */
export async function renderScenesToVideo(
  scenes: DreamScene[],
  width: number,
  height: number,
  fps: number,
  onProgress?: (elapsedSeconds: number, totalSeconds: number) => void,
  audioTrack?: AudioTrackHandle | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D コンテキストを取得できませんでした。");

  const mimeType = pickSupportedMimeType();
  const totalSeconds = scenes[scenes.length - 1]?.endTime ?? 0;
  const videoStream = canvas.captureStream(fps);

  const combinedStream = audioTrack
    ? new MediaStream([...videoStream.getVideoTracks(), ...audioTrack.stream.getAudioTracks()])
    : videoStream;

  const recorder = new MediaRecorder(combinedStream, { mimeType });
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

  try {
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsedSeconds = (performance.now() - startedAt) / 1000;
        if (elapsedSeconds >= totalSeconds) {
          resolve();
          return;
        }
        const scene =
          scenes.find((s) => elapsedSeconds >= s.startTime && elapsedSeconds < s.endTime) ??
          scenes[scenes.length - 1];
        drawScene(ctx, scene, width, height, elapsedSeconds - scene.startTime);
        onProgress?.(elapsedSeconds, totalSeconds);
        setTimeout(tick, frameIntervalMs);
      };
      tick();
    });
  } finally {
    recorder.stop();
    audioTrack?.stop();
  }

  await stopped;

  return new Blob(chunks, { type: mimeType });
}
