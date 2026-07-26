import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clapperboard, Pencil, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreBar } from "@/components/common/ScoreBar";
import { FilmStrip } from "@/components/common/FilmStrip";
import { OrganizationResultCard } from "@/components/common/OrganizationResultCard";
import { MoviePackageSummaryCard } from "@/components/common/MoviePackageSummaryCard";
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
import { MOOD_EMOJI, MOOD_LABEL } from "@/types/dream";
import { formatDateLongJP } from "@/utils/date";

const SCORE_FIELDS: { key: "cinematic" | "emotion" | "story" | "wonder"; label: string }[] = [
  { key: "cinematic", label: "映画映え" },
  { key: "emotion", label: "感情" },
  { key: "story", label: "ストーリー性" },
  { key: "wonder", label: "不思議度" },
];

export function DreamDetailPage() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const navigate = useNavigate();
  const { getDreamById, removeDream, isLoading } = useDreams();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const dream = dreamId ? getDreamById(dreamId) : undefined;

  const handleDelete = async () => {
    if (!dream) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeDream(dream.id);
      navigate("/home", { replace: true });
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

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="夢の詳細" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!dream) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="夢の詳細" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            この夢の記録は見つかりませんでした。削除されたか、URLが正しくない可能性があります。
          </p>
          <Button asChild variant="secondary">
            <Link to="/home">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="夢の詳細" />

      <div className="flex flex-col gap-6 px-5 py-6">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dream.status} />
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              <span aria-hidden="true">{MOOD_EMOJI[dream.mood]}</span>
              {MOOD_LABEL[dream.mood]}
            </span>
            <time dateTime={dream.createdAt} className="text-xs text-muted-foreground">
              {formatDateLongJP(dream.createdAt)}
            </time>
          </div>
          <h1 className="font-display text-2xl font-semibold leading-snug text-foreground">
            {dream.title}
          </h1>
        </header>

        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
          {dream.body}
        </p>

        {dream.organization ? (
          <OrganizationResultCard result={dream.organization} title="AI整理結果" />
        ) : null}

        {dream.moviePackage ? (
          <MoviePackageSummaryCard moviePackage={dream.moviePackage} dreamId={dream.id} />
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/dream/${dream.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              編集
            </Link>
          </Button>
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

        <Button variant="outline" className="w-full border-gold/40 text-gold" asChild>
          <Link to={`/dream/${dream.id}/organize`}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {dream.organization ? "AI整理結果を見る" : "AIで整理する"}
          </Link>
        </Button>

        {/* 「映画化する」はAI整理完了後にのみ表示する (WORK_ORDER Sprint5) */}
        {dream.organization ? (
          <Button variant="outline" className="w-full border-gold/40 text-gold" asChild>
            <Link to={`/dream/${dream.id}/movie`}>
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
              {dream.moviePackage ? "Movie Packageを見る" : "映画化する"}
            </Link>
          </Button>
        ) : null}

        <FilmStrip />

        <Card>
          <CardHeader>
            <CardTitle>Dream Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {SCORE_FIELDS.map((field) => (
              <ScoreBar key={field.key} label={field.label} value={dream.score[field.key]} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 編集: Sprint3で実装。編集ページ(/dream/:id/edit)へ遷移するリンクに変更済み */}
      {/* 映画生成: Sprint5で「映画化する」(Movie Package生成)として実装。旧プレースホルダーダイアログは削除済み */}

      {/* 削除確認ダイアログ: 実際にLocalStorageから削除する */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この夢を削除しますか？</DialogTitle>
            <DialogDescription>
              「{dream.title}」を削除します。この操作は取り消せません。
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
