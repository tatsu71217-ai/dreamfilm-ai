import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import type { RenderJob } from "@/types/render";

/**
 * RenderJob.outputUrl から、実際に <video> の src として使えるURLを解決する。
 *
 * - Mockプロバイダー: outputUrlをそのまま返す（公開URLのため認証不要）
 * - Google Veoプロバイダー: Gemini APIが返すファイルURIは認証が必要なため、
 *   保存済みのAPIキーをクエリパラメータとして付与する
 *
 * NOTE: Google Veo (Gemini Files API) の実際の認証方式は、本サンドボックス環境では
 * ネットワークアクセスができないため未検証。動作しない場合はGoogle公式ドキュメントの
 * Files APIの手順に従って調整すること（詳細はSPRINT_REPORT.mdを参照）。
 */
export async function resolvePlayableVideoUrl(job: RenderJob): Promise<string | null> {
  if (!job.outputUrl) {
    return null;
  }

  if (job.provider !== "veo") {
    return job.outputUrl;
  }

  const settings = await videoProviderSettingsRepository.get();
  if (!settings.googleVeoApiKey) {
    return job.outputUrl;
  }

  const separator = job.outputUrl.includes("?") ? "&" : "?";
  return `${job.outputUrl}${separator}key=${encodeURIComponent(settings.googleVeoApiKey)}`;
}
