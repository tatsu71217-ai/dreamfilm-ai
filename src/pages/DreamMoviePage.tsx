import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clapperboard, Video } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { MoviePackageResultCard } from "@/components/common/MoviePackageResultCard";
import { Button } from "@/components/ui/button";
import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import { useDreams } from "@/hooks/useDreams";
import { useMovieGenerator } from "@/hooks/useMovieGenerator";
import { useRenderJobs } from "@/hooks/useRenderJobs";
import type { VideoProviderId } from "@/services/video/types";
import { VIDEO_PROVIDER_LABEL } from "@/types/render";
import { DEFAULT_STYLE_ID, STYLE_PRESETS, type StyleId } from "@/types/style";
import {
  DEFAULT_VIDEO_DURATION,
  VIDEO_DURATION_OPTIONS,
  type VideoDurationSeconds,
} from "@/types/videoProject";
import { cn } from "@/utils/cn";
import { generateId } from "@/utils/id";

export function DreamMoviePage() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const navigate = useNavigate();
  const { getDreamById, saveMoviePackage, isLoading } = useDreams();
  const { status, result, errorMessage, generate, reset } = useMovieGenerator();
  const { startRender } = useRenderJobs();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isStartingRender, setIsStartingRender] = React.useState(false);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState<VideoDurationSeconds>(
    DEFAULT_VIDEO_DURATION,
  );
  const [styleId, setStyleId] = React.useState<StyleId>(DEFAULT_STYLE_ID);
  const [selectedProvider, setSelectedProvider] = React.useState<VideoProviderId | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    videoProviderSettingsRepository.get().then((settings) => {
      if (isMounted) setSelectedProvider(settings.selectedProvider);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 尺・スタイルの選択はローカル生成(local)にのみ反映される。
  // Pollinations/Veoは常にMovie Packageの内容からプロンプトを組み立てるため、
  // 誤解を招かないよう他のプロバイダー選択時はピッカーを表示しない。
  const isLocalProvider = selectedProvider === "local";

  const dream = dreamId ? getDreamById(dreamId) : undefined;

  const handleGenerate = () => {
    if (!dream) return;
    setSaveError(null);
    void generate(dream);
  };

  const handleSave = async () => {
    if (!dream || !result) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveMoviePackage(dream.id, {
        ...result,
        id: generateId(),
        generatedAt: new Date().toISOString(),
      });
      navigate(`/dream/${dream.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Movie Packageの保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartRender = async () => {
    if (!dream?.moviePackage) return;
    setIsStartingRender(true);
    setRenderError(null);
    try {
      const job = await startRender(dream, dream.moviePackage, { styleId, durationSeconds });
      navigate(`/render/${job.id}`);
    } catch (error) {
      setRenderError(
        error instanceof Error
          ? error.message
          : "動画生成の開始に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsStartingRender(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="映画化する" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!dream) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="映画化する" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            対象の夢が見つかりませんでした。削除されたか、URLが正しくない可能性があります。
          </p>
          <Button asChild variant="secondary">
            <Link to="/home">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!dream.organization) {
    // AI整理完了後にのみ映画化できる
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="映画化する" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            映画化するには、先にこの夢をAIで整理する必要があります。
          </p>
          <Button asChild>
            <Link to={`/dream/${dream.id}/organize`}>AIで整理する</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 既に生成済みの場合は、フックの結果より保存済みデータを優先して表示する
  const displayedResult = result ?? dream.moviePackage ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="映画化する" />

      <div className="flex flex-1 flex-col gap-6 px-5 py-6">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            AIによる整理結果をもとに、「{dream.title}
            」をショートムービー用のMovie Package（タイトル・シーン構成・各種Prompt）へ変換します。
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={status === "processing"}
            className="mt-1"
          >
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
            {status === "processing"
              ? "生成中…"
              : dream.moviePackage || result
                ? "もう一度映画化する"
                : "映画化する"}
          </Button>
        </div>

        {status === "processing" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              AIがMovie Packageを生成しています…
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
          >
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button type="button" variant="secondary" size="sm" onClick={reset}>
              閉じる
            </Button>
          </div>
        ) : null}

        {displayedResult ? (
          <>
            <MoviePackageResultCard moviePackage={displayedResult} />

            {result ? (
              <>
                {saveError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {saveError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "保存中…" : "この内容を保存する"}
                </Button>
              </>
            ) : null}
          </>
        ) : null}

        {/* 「動画を生成」はMovie Packageが保存済みの場合にのみ表示する */}
        {dream.moviePackage ? (
          <div className="flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm text-muted-foreground">
              保存済みのMovie Packageから、実際のショートムービーを生成します。
              動画生成プロバイダーとAPIキーは設定画面で変更できます。
            </p>

            {isLocalProvider ? (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">動画の長さ</span>
                  <div
                    className="flex gap-2"
                    role="radiogroup"
                    aria-label="動画の長さを選択"
                  >
                    {VIDEO_DURATION_OPTIONS.map((option) => {
                      const isActive = option === durationSeconds;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setDurationSeconds(option)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-sm",
                            isActive
                              ? "border-gold bg-gold/15 text-gold"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {option}秒
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">映像スタイル</span>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="映像スタイルを選択"
                  >
                    {Object.values(STYLE_PRESETS).map((preset) => {
                      const isActive = preset.id === styleId;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setStyleId(preset.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs",
                            isActive
                              ? "border-gold bg-gold/15 text-gold"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : selectedProvider ? (
              <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                現在のプロバイダー「{VIDEO_PROVIDER_LABEL[selectedProvider]}
                」は動画の長さ・映像スタイルの選択には対応していません。Movie Packageの内容から自動で生成されます。
              </p>
            ) : null}

            {renderError ? (
              <p role="alert" className="text-sm text-destructive">
                {renderError}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={handleStartRender}
              disabled={isStartingRender}
              className="w-full"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              {isStartingRender ? "開始中…" : "動画を生成"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
