import * as React from "react";
import { dreamRepository } from "@/data/dreamRepository";
import type { CreateDreamInput, Dream, DreamOrganization, UpdateDreamInput } from "@/types/dream";
import type { DreamMoviePackage } from "@/types/movie";

interface DreamsContextValue {
  dreams: Dream[];
  /** 初回データ取得中かどうか */
  isLoading: boolean;
  /** 新しい夢を保存する。保存後の夢データを返す */
  addDream: (input: CreateDreamInput) => Promise<Dream>;
  /** 既存の夢を編集する。更新後の夢データを返す */
  updateDream: (id: string, input: UpdateDreamInput) => Promise<Dream>;
  /** AIによる整理結果を既存の夢へ保存する。更新後の夢データを返す */
  saveOrganization: (id: string, organization: DreamOrganization) => Promise<Dream>;
  /** Dream Movie Packageを既存の夢へ保存する。更新後の夢データを返す */
  saveMoviePackage: (id: string, moviePackage: DreamMoviePackage) => Promise<Dream>;
  /** IDから夢を1件取得する（見つからない場合は undefined） */
  getDreamById: (id: string) => Dream | undefined;
  /** IDを指定して夢を削除する */
  removeDream: (id: string) => Promise<void>;
}

const DreamsContext = React.createContext<DreamsContextValue | undefined>(undefined);

/**
 * 夢データをアプリ全体で共有するためのProvider。
 * データ取得元は data/dreamRepository.ts に隠蔽しており、
 * ここではUIに必要な状態（loading等）の管理のみを担当する。
 */
export function DreamsProvider({ children }: { children: React.ReactNode }) {
  const [dreams, setDreams] = React.useState<Dream[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    dreamRepository.list().then((result) => {
      if (isMounted) {
        setDreams(result);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const addDream = React.useCallback(async (input: CreateDreamInput) => {
    const created = await dreamRepository.create(input);
    setDreams((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateDream = React.useCallback(async (id: string, input: UpdateDreamInput) => {
    const updated = await dreamRepository.update(id, input);
    setDreams((prev) => prev.map((dream) => (dream.id === id ? updated : dream)));
    return updated;
  }, []);

  const saveOrganization = React.useCallback(
    async (id: string, organization: DreamOrganization) => {
      const updated = await dreamRepository.saveOrganization(id, organization);
      setDreams((prev) => prev.map((dream) => (dream.id === id ? updated : dream)));
      return updated;
    },
    [],
  );

  const saveMoviePackage = React.useCallback(
    async (id: string, moviePackage: DreamMoviePackage) => {
      const updated = await dreamRepository.saveMoviePackage(id, moviePackage);
      setDreams((prev) => prev.map((dream) => (dream.id === id ? updated : dream)));
      return updated;
    },
    [],
  );

  const removeDream = React.useCallback(async (id: string) => {
    await dreamRepository.remove(id);
    setDreams((prev) => prev.filter((dream) => dream.id !== id));
  }, []);

  const getDreamById = React.useCallback(
    (id: string) => dreams.find((dream) => dream.id === id),
    [dreams],
  );

  const value = React.useMemo<DreamsContextValue>(
    () => ({
      dreams,
      isLoading,
      addDream,
      updateDream,
      saveOrganization,
      saveMoviePackage,
      getDreamById,
      removeDream,
    }),
    [
      dreams,
      isLoading,
      addDream,
      updateDream,
      saveOrganization,
      saveMoviePackage,
      getDreamById,
      removeDream,
    ],
  );

  return <DreamsContext.Provider value={value}>{children}</DreamsContext.Provider>;
}

export function useDreams(): DreamsContextValue {
  const context = React.useContext(DreamsContext);
  if (!context) {
    throw new Error("useDreams は DreamsProvider の内部でのみ使用できます。");
  }
  return context;
}
