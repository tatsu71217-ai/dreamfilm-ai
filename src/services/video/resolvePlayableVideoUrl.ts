import { videoBlobStore } from "@/data/videoBlobStore";
import { LOCAL_VIDEO_URL_MARKER } from "@/services/video/types";
import type { RenderJob } from "@/types/render";

/**
 * RenderJob から、実際に `<video>` の src として使えるURLを解決する。
 *
 * 実プロバイダー（Pollinations / Google Veo）は動画本体を IndexedDB へ保存し、
 * RenderJob.outputUrl には `LOCAL_VIDEO_URL_MARKER` だけを記録している。
 * 理由は2つある:
 *  - Pollinationsの動画APIはMP4バイナリを直接返すため、そもそも永続的なURLが存在しない
 *  - Veoのダウンロードリンクは `x-goog-api-key` ヘッダー必須の署名付きURLで、
 *    `<video src>` からはヘッダーを送れず、URLをそのまま保存しても後から再生できない
 *    （旧実装は `?key=` をクエリに付与していたが、これは公式の手順ではない）
 *
 * ここで Object URL を発行するため、**呼び出し側は不要になった時点で
 * `releasePlayableVideoUrl()` を必ず呼ぶこと**（呼ばないとメモリリークになる）。
 */
export async function resolvePlayableVideoUrl(job: RenderJob): Promise<string | null> {
  if (!job.outputUrl) {
    return null;
  }

  if (job.outputUrl === LOCAL_VIDEO_URL_MARKER) {
    const blob = await videoBlobStore.get(job.id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  // 旧バージョンのMockプロバイダーが保存した公開URL等、そのまま再生できるもの
  return job.outputUrl;
}

/**
 * resolvePlayableVideoUrl が発行した Object URL を解放する。
 * `blob:` 以外（外部URL）が渡された場合は何もしない。
 */
export function releasePlayableVideoUrl(url: string | null): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
