import * as React from "react";
import { Maximize, Pause, Play } from "lucide-react";
import { cn } from "@/utils/cn";

interface VideoPlayerProps {
  src: string;
  className?: string;
}

/** iOS Safari固有の全画面API（video要素専用）。標準のFullscreen APIとは別物 */
type IOSVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

/**
 * 再生/一時停止/シークバー/全画面表示に対応したカスタム動画プレイヤー。
 * WORK_ORDER (Sprint8) の「動画プレビュー」要件（iPhone/Android対応）に対応する。
 *
 * ブラウザ標準のcontrols属性はiOS SafariとAndroid Chromeで見た目が大きく異なるため、
 * アプリの世界観に合わせた共通のUIを自前で実装している。
 * 全画面表示は、標準の Fullscreen API を優先しつつ、それが使えない場合（主にiOS Safari）は
 * video要素専用の `webkitEnterFullscreen()` にフォールバックする。
 */
export function VideoPlayer({ src, className }: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePauseOrEnd = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePauseOrEnd);
    video.addEventListener("ended", handlePauseOrEnd);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePauseOrEnd);
      video.removeEventListener("ended", handlePauseOrEnd);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(event.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleFullscreen = () => {
    const video = videoRef.current as IOSVideoElement | null;
    if (!video) return;

    if (typeof video.webkitEnterFullscreen === "function") {
      video.webkitEnterFullscreen();
    } else if (video.requestFullscreen) {
      void video.requestFullscreen();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="aspect-video w-full"
          onClick={togglePlay}
        >
          <track kind="captions" />
        </video>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "一時停止" : "再生"}
          className="absolute inset-0 flex items-center justify-center transition-colors hover:bg-black/10"
        >
          {!isPlaying ? (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="h-6 w-6" aria-hidden="true" fill="currentColor" />
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "一時停止" : "再生"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          aria-label="再生位置"
          className="h-1.5 flex-1 accent-gold"
        />

        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={handleFullscreen}
          aria-label="全画面表示"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <Maximize className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
