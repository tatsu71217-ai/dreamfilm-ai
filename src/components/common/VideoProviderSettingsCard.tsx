import * as React from "react";
import { Clapperboard, Cpu, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import {
  clampDuration,
  findPollinationsVideoModel,
  POLLINATIONS_VIDEO_MODELS,
  type VideoProviderId,
} from "@/services/video/types";
import { MOVIE_DURATION_SECONDS } from "@/types/movie";
import { VIDEO_PROVIDER_LABEL } from "@/types/render";
import {
  DEFAULT_VIDEO_PROVIDER_SETTINGS,
  SELECTABLE_VIDEO_PROVIDERS,
} from "@/types/videoProviderSettings";
import { cn } from "@/utils/cn";

const POLLINATIONS_KEY_URL = "https://enter.pollinations.ai";
const GOOGLE_AI_STUDIO_KEY_URL = "https://aistudio.google.com/apikey";

/**
 * 動画生成プロバイダーの選択とAPIキー入力を行うカード。
 *
 * このコンポーネントは自身で設定の読み込み・保存を完結させており、
 * グローバルなContextは持たない（RenderServiceは保存先のLocalStorageを直接読むため、
 * 両者の間でReact Stateを共有する必要がない）。
 */
export function VideoProviderSettingsCard() {
  const [selectedProvider, setSelectedProvider] = React.useState<VideoProviderId>(
    DEFAULT_VIDEO_PROVIDER_SETTINGS.selectedProvider,
  );
  const [pollinationsApiKey, setPollinationsApiKey] = React.useState("");
  const [pollinationsModel, setPollinationsModel] = React.useState(
    DEFAULT_VIDEO_PROVIDER_SETTINGS.pollinationsModel,
  );
  const [googleVeoApiKey, setGoogleVeoApiKey] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    videoProviderSettingsRepository.get().then((settings) => {
      if (!isMounted) return;
      setSelectedProvider(settings.selectedProvider);
      setPollinationsApiKey(settings.pollinationsApiKey);
      setPollinationsModel(settings.pollinationsModel);
      setGoogleVeoApiKey(settings.googleVeoApiKey);
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
        pollinationsApiKey: pollinationsApiKey.trim(),
        pollinationsModel,
        googleVeoApiKey: googleVeoApiKey.trim(),
      });
      setSaveMessage("保存しました。");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "設定の保存に失敗しました。");
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
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="動画生成プロバイダーを選択"
        >
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
                  "flex-1 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-colors",
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
      </div>

      {selectedProvider === "pollinations" ? (
        <PollinationsSettings
          apiKey={pollinationsApiKey}
          onApiKeyChange={setPollinationsApiKey}
          model={pollinationsModel}
          onModelChange={setPollinationsModel}
        />
      ) : null}

      {selectedProvider === "veo" ? (
        <VeoSettings apiKey={googleVeoApiKey} onApiKeyChange={setGoogleVeoApiKey} />
      ) : null}

      {selectedProvider === "mock" ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          開発用のダミープロバイダーです。実際の動画は生成されず、サンプル動画が返ります。
        </p>
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

interface PollinationsSettingsProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
}

function PollinationsSettings({
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
}: PollinationsSettingsProps) {
  const selectedModel = findPollinationsVideoModel(model);
  const effectiveDuration = selectedModel
    ? clampDuration(MOVIE_DURATION_SECONDS, selectedModel.duration)
    : MOVIE_DURATION_SECONDS;
  const estimatedPollen = selectedModel
    ? selectedModel.pollenPerSecond * effectiveDuration
    : 0;

  return (
    <>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="pollinations-api-key"
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Pollinations API Key
        </label>
        <Input
          id="pollinations-api-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder="Pollinations で発行したAPIキーを入力"
        />
        <a
          href={POLLINATIONS_KEY_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-gold underline-offset-4 hover:underline"
        >
          無料でAPIキーを取得する
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        <p className="text-xs text-muted-foreground">
          登録すると日次で無料のPollen（生成クレジット）が付与されます。キーは暗号化せずブラウザのLocalStorageに保存されるため、共有端末では入力しないでください。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span
          id="pollinations-model-label"
          className="flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <Clapperboard className="h-4 w-4" aria-hidden="true" />
          動画モデル
        </span>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-labelledby="pollinations-model-label"
        >
          {POLLINATIONS_VIDEO_MODELS.map((option) => {
            const isActive = option.id === model;
            const duration = clampDuration(MOVIE_DURATION_SECONDS, option.duration);
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onModelChange(option.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-gold bg-gold/15"
                    : "border-border bg-secondary/40 hover:border-gold/40",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-gold" : "text-foreground",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.brand}</span>
                  {!option.requiresPaidBalance ? (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium text-gold">
                      無料枠で利用可
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
                <span className="text-xs text-muted-foreground">
                  約{duration}秒 / 目安 {formatPollen(option.pollenPerSecond * duration)}{" "}
                  Pollen
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedModel ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Movie Packageの尺は{MOVIE_DURATION_SECONDS}
          秒ですが、選択中のモデルの制約に合わせて
          <span className="text-foreground"> 約{effectiveDuration}秒 </span>
          で生成されます（目安 {formatPollen(estimatedPollen)} Pollen ≒ $
          {formatPollen(estimatedPollen)}）。
        </p>
      ) : null}
    </>
  );
}

function VeoSettings({
  apiKey,
  onApiKeyChange,
}: {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}) {
  return (
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
        onChange={(event) => onApiKeyChange(event.target.value)}
        placeholder="AI Studio で発行したAPIキーを入力"
      />
      <a
        href={GOOGLE_AI_STUDIO_KEY_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-xs text-gold underline-offset-4 hover:underline"
      >
        APIキーを取得する
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        Veoには無料枠がありません（最安のLiteでも $0.05/秒、8秒で約 $0.40）。課金を有効にした
        Google アカウントが必要です。無料で試す場合は Pollinations を選択してください。
      </p>
      <p className="text-xs text-muted-foreground">
        キーは暗号化せずブラウザのLocalStorageに保存されます。共有端末では入力しないでください。
      </p>
    </div>
  );
}

/** Pollen表示は小数が多くなるため、有効な桁だけを見せる */
function formatPollen(value: number): string {
  return value < 0.01 ? value.toFixed(3) : value.toFixed(2);
}
