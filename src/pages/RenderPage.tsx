import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, RotateCcw, Share2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ProgressBar } from "@/components/common/ProgressBar";
import { RenderStatusBadge } from "@/components/common/RenderStatusBadge";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useDreams } from "@/hooks/useDreams";
import { useRenderJobs } from "@/hooks/useRenderJobs";
import { resolvePlayableVideoUrl } from "@/services/video/resolvePlayableVideoUrl";
import { VIDEO_PROVIDER_LABEL, type RenderJob } from "@/types/render";
import { formatDateLongJP } from "@/utils/date";
import { saveVideoToDevice, shareVideo } from "@/utils/videoActions";

const IN_PROGRESS_STATUSES = new Set(["waiting", "preparing", "rendering"]);

/**
 * 「API接続状態」の表示用ラベルを、RenderJobの現在の状態から導出する。
 * WORK_ORDER (Sprint7) の表示要件だが、RenderJob自体には専用フィールドを追加せず、
 * 既存の status / provider / errorMessage から画面表示のためだけに算出している。
 */
function deriveConnectionStatusLabel(job: RenderJob): string {
  if (job.provider === "mock") {
    return "モック（外部API接続なし）";
  }

  switch (job.status) {
    case "waiting":
    case "preparing":
      return "接続中…";
    case "rendering":
      return "接続済み";
    case "completed":
      return "接続済み（完了）";
    case "failed":
      return job.errorMessage?.includes("APIキー") ? "認証エラー" : "通信エラー";
    case "cancelled":
      return "キャンセル済み";
    default:
      return "-";
  }
}

export function RenderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const {
    getJobById,
    cancelRender,
    removeJob,
    startRender,
    isLoading: isJobsLoading,
  } = useRenderJobs();
  const { getDreamById, isLoading: isDreamsLoading } = useDreams();

  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryError, setRetryError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareError, setShareError] = React.useState<string | null>(null);
  const [playableVideoUrl, setPlayableVideoUrl] = React.useState<string | null>(null);

  const job = jobId ? getJobById(jobId) : undefined;
  const dream = job ? getDreamById(job.dreamId) : undefined;
  const movieTitle = dream?.moviePackage?.movieTitle ?? dream?.title ?? "動画生成";

  React.useEffect(() => {
    let isCancelled = false;

    if (job?.status === "completed" && job.outputUrl) {
      resolvePlayableVideoUrl(job).then((url) => {
        if (!isCancelled) setPlayableVideoUrl(url);
      });
    } else {
      setPlayableVideoUrl(null);
    }

    return () => {
      isCancelled = true;
    };
    // job is intentionally narrowed to its relevant fields: it changes identity on every
    // polling tick (progress updates), and re-resolving the playable URL only needs to run
    // when status/outputUrl/provider actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.outputUrl, job?.provider]);

  const handleCancel = async () => {
    if (!job) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelRender(job.id);
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "キャンセルに失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!dream?.moviePackage) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      const newJob = await startRender(dream, dream.moviePackage);
      navigate(`/render/${newJob.id}`, { replace: true });
    } catch (error) {
      setRetryError(
        error instanceof Error
          ? error.message
          : "再試行に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeJob(job.id);
      navigate("/render-history", { replace: true });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "削除に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!playableVideoUrl) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveVideoToDevice(playableVideoUrl, `${movieTitle}.mp4`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!playableVideoUrl) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await shareVideo(playableVideoUrl, `${movieTitle}.mp4`);
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "共有に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSharing(false);
    }
  };

  if (isJobsLoading || isDreamsLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="動画生成" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="動画生成" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            指定されたレンダリングジョブが見つかりませんでした。
          </p>
          <Button asChild variant="secondary">
            <Link to="/home">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isInProgress = IN_PROGRESS_STATUSES.has(job.status);
  const isFailed = job.status === "failed";

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="動画生成" />

      <div className="flex flex-col gap-6 px-5 py-6">
        {playableVideoUrl ? (
          <div className="flex flex-col gap-3">
            <VideoPlayer src={playableVideoUrl} />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "保存中…" : "保存"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleShare}
                disabled={isSharing}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {isSharing ? "共有中…" : "共有"}
              </Button>
            </div>
            {saveError ? (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            ) : null}
            {shareError ? (
              <p role="alert" className="text-sm text-destructive">
                {shareError}
              </p>
            ) : null}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{movieTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <RenderStatusBadge status={job.status} />
              <span className="text-xs text-muted-foreground">
                {VIDEO_PROVIDER_LABEL[job.provider]}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="font-display text-sm font-semibold text-gold">
                  {job.progress}%
                </span>
              </div>
              <ProgressBar value={job.progress} aria-label="レンダリング進捗" />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">API接続状態</dt>
                <dd className="text-foreground/90">{deriveConnectionStatusLabel(job)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">開始時間</dt>
                <dd className="text-foreground/90">
                  {job.startedAt ? formatDateLongJP(job.startedAt) : "-"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">完了時間</dt>
                <dd className="text-foreground/90">
                  {job.completedAt ? formatDateLongJP(job.completedAt) : "-"}
                </dd>
              </div>
            </dl>

            {isFailed && job.errorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                {job.errorMessage}
              </p>
            ) : null}

            {cancelError ? (
              <p role="alert" className="text-sm text-destructive">
                {cancelError}
              </p>
            ) : null}
            {retryError ? (
              <p role="alert" className="text-sm text-destructive">
                {retryError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {isInProgress ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full"
          >
            {isCancelling ? "キャンセル中…" : "キャンセル"}
          </Button>
        ) : null}

        {isFailed && dream?.moviePackage ? (
          <Button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {isRetrying ? "再試行中…" : "再試行"}
          </Button>
        ) : null}

        <div className="flex gap-3">
          {dream ? (
            <Button asChild variant="secondary" className="flex-1">
              <Link to={`/dream/${dream.id}`}>夢の詳細へ戻る</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            削除
          </Button>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この履歴を削除しますか？</DialogTitle>
            <DialogDescription>
              「{movieTitle}」のレンダリング履歴を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" className="w-full sm:w-auto" disabled={isDeleting}>
                キャンセル
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
