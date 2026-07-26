import * as React from "react";
import { renderJobRepository } from "@/data/renderJobRepository";
import { videoBlobStore } from "@/data/videoBlobStore";
import { renderService } from "@/services/render";
import type { LocalRenderInput } from "@/services/video/types";
import type { Dream } from "@/types/dream";
import type { DreamMoviePackage } from "@/types/movie";
import type { RenderJob } from "@/types/render";

/** ローカル生成（LocalCanvasVideoProvider）選択時にのみ使用するスタイル・尺の指定 */
export interface LocalRenderOptions {
  styleId: LocalRenderInput["styleId"];
  durationSeconds: LocalRenderInput["durationSeconds"];
}

interface RenderJobsContextValue {
  jobs: RenderJob[];
  /** 初回データ取得中かどうか */
  isLoading: boolean;
  /** レンダリングジョブを開始する。作成直後のジョブ（status: waiting）を返す */
  startRender: (
    dream: Dream,
    moviePackage: DreamMoviePackage,
    localOptions?: LocalRenderOptions,
  ) => Promise<RenderJob>;
  /** 実行中のジョブをキャンセルする。更新後のジョブを返す */
  cancelRender: (jobId: string) => Promise<RenderJob>;
  /** Render履歴からジョブを削除する */
  removeJob: (jobId: string) => Promise<void>;
  getJobById: (jobId: string) => RenderJob | undefined;
  getJobsByDreamId: (dreamId: string) => RenderJob[];
}

const RenderJobsContext = React.createContext<RenderJobsContextValue | undefined>(undefined);

/**
 * レンダリングジョブをアプリ全体で共有するためのProvider。
 *
 * services/render/RenderService.ts はジョブの状態が変化するたびに `onUpdate` コールバックを
 * 呼び出す設計になっているため、ここではそのコールバックを使ってReact Stateへ反映するだけで、
 * UI側で独自にポーリングする必要がない（RenderPage等は `jobs` の変化に応じて自動的に再描画される）。
 */
export function RenderJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<RenderJob[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    renderJobRepository.list().then((result) => {
      if (isMounted) {
        setJobs(result);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const upsertJob = React.useCallback((updated: RenderJob) => {
    setJobs((prev) => {
      const exists = prev.some((job) => job.id === updated.id);
      return exists
        ? prev.map((job) => (job.id === updated.id ? updated : job))
        : [updated, ...prev];
    });
  }, []);

  const startRender = React.useCallback(
    async (dream: Dream, moviePackage: DreamMoviePackage, localOptions?: LocalRenderOptions) => {
      const job = await renderService.startRender({
        dream,
        moviePackage,
        onUpdate: upsertJob,
        localOptions,
      });
      upsertJob(job);
      return job;
    },
    [upsertJob],
  );

  const cancelRender = React.useCallback(
    async (jobId: string) => {
      const updated = await renderService.cancelRender(jobId);
      upsertJob(updated);
      return updated;
    },
    [upsertJob],
  );

  const removeJob = React.useCallback(async (jobId: string) => {
    await renderJobRepository.remove(jobId);
    // 履歴を消したら動画本体（IndexedDB）も破棄する。残すと参照されないまま容量を食い続ける
    await videoBlobStore.remove(jobId);
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  const getJobById = React.useCallback(
    (jobId: string) => jobs.find((job) => job.id === jobId),
    [jobs],
  );

  const getJobsByDreamId = React.useCallback(
    (dreamId: string) => jobs.filter((job) => job.dreamId === dreamId),
    [jobs],
  );

  const value = React.useMemo<RenderJobsContextValue>(
    () => ({
      jobs,
      isLoading,
      startRender,
      cancelRender,
      removeJob,
      getJobById,
      getJobsByDreamId,
    }),
    [jobs, isLoading, startRender, cancelRender, removeJob, getJobById, getJobsByDreamId],
  );

  return <RenderJobsContext.Provider value={value}>{children}</RenderJobsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider and its consumer hook are intentionally colocated
export function useRenderJobs(): RenderJobsContextValue {
  const context = React.useContext(RenderJobsContext);
  if (!context) {
    throw new Error("useRenderJobs は RenderJobsProvider の内部でのみ使用できます。");
  }
  return context;
}
