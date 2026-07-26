import * as React from "react";
import { Cpu, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import type { VideoProviderId } from "@/services/video";
import { VIDEO_PROVIDER_LABEL } from "@/types/render";
import { SELECTABLE_VIDEO_PROVIDERS } from "@/types/videoProviderSettings";
import { cn } from "@/utils/cn";

/**
 * 動画生成プロバイダーの選択とAPIキー入力を行うカード。
 * WORK_ORDER (Sprint7) の「Provider設定」「APIキー管理」要件に対応する。
 *
 * このコンポーネントは自身で設定の読み込み・保存を完結させており、
 * グローバルなContextは持たない（RenderServiceは保存先のLocalStorageを直接読むため、
 * 両者の間でReact Stateを共有する必要がない）。
 */
export function VideoProviderSettingsCard() {
  const [selectedProvider, setSelectedProvider] = React.useState<VideoProviderId>("mock");
  const [apiKey, setApiKey] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    videoProviderSettingsRepository.get().then((settings) => {
      if (!isMounted) return;
      setSelectedProvider(settings.selectedProvider);
      setApiKey(settings.googleVeoApiKey);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await videoProviderSettingsRepository.save({
        selectedProvider,
        googleVeoApiKey: apiKey.trim(),
      });
      setSaveMessage("保存しました。");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "設定の保存に失敗しました。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Cpu className="h-4 w-4" aria-hidden="true" />
          動画生成プロバイダー
        </span>
        <div className="flex gap-2" role="radiogroup" aria-label="動画生成プロバイダーを選択">
          {SELECTABLE_VIDEO_PROVIDERS.map((providerId) => {
            const isActive = selectedProvider === providerId;
            return (
              <button
                key={providerId}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelectedProvider(providerId)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {VIDEO_PROVIDER_LABEL[providerId]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">既定はMockです。</p>
      </div>

      {selectedProvider === "veo" ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="google-veo-api-key"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Google AI Studio API Key
          </label>
          <Input
            id="google-veo-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="AI Studio で発行したAPIキーを入力"
          />
          <p className="text-xs text-muted-foreground">
            このキーは暗号化せずブラウザのLocalStorageに保存されます。共有端末では入力しないでください。
          </p>
        </div>
      ) : null}

      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      {saveMessage ? <p className="text-sm text-gold">{saveMessage}</p> : null}

      <Button type="button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? "保存中…" : "設定を保存"}
      </Button>
    </div>
  );
}
