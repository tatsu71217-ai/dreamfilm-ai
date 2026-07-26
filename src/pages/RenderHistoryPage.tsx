import { Link } from "react-router-dom";
import { Film } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { RenderStatusBadge } from "@/components/common/RenderStatusBadge";
import { Card } from "@/components/ui/card";
import { useDreams } from "@/hooks/useDreams";
import { useRenderJobs } from "@/hooks/useRenderJobs";
import { VIDEO_PROVIDER_LABEL } from "@/types/render";
import { formatDateLongJP } from "@/utils/date";

/**
 * レンダリング履歴一覧画面（Movie Title / Provider / Status / 作成日時を表示）。
 *
 * Movie Titleは RenderJob 自体には保存されておらず（フィールドとして定義されていないため）、
 * dreamId から夢を引き、その時点の dream.moviePackage.movieTitle を表示している。
 * Movie Packageが再生成された後は、過去のジョブの表示タイトルも最新のものに変わる点に注意。
 */
export function RenderHistoryPage() {
  const { jobs, isLoading: isJobsLoading } = useRenderJobs();
  const { getDreamById, isLoading: isDreamsLoading } = useDreams();

  const isLoading = isJobsLoading || isDreamsLoading;

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="レンダリング履歴" />

      <div className="flex flex-col gap-3 px-5 py-6">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">読み込み中…</p>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-gold">
              <Film className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              まだレンダリング履歴がありません。
              <br />
              Movie Packageから「動画を生成」を実行すると、ここに表示されます。
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const dream = getDreamById(job.dreamId);
            const movieTitle = dream?.moviePackage?.movieTitle ?? dream?.title ?? "(不明な夢)";

            return (
              <Link
                key={job.id}
                to={`/render/${job.id}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="flex flex-col gap-2 p-4 transition-colors hover:border-gold/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-display text-base font-medium text-foreground">
                      {movieTitle}
                    </p>
                    <RenderStatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{VIDEO_PROVIDER_LABEL[job.provider]}</span>
                    <time dateTime={job.createdAt}>{formatDateLongJP(job.createdAt)}</time>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
