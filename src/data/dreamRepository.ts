import {
  DREAMS_STORAGE_KEY,
  type CreateDreamInput,
  type Dream,
  type DreamOrganization,
  type Mood,
  type UpdateDreamInput,
} from "@/types/dream";
import type { DreamMoviePackage } from "@/types/movie";
import { generateDreamId, generateDummyScore } from "@/utils/dream";

/**
 * 夢データへのアクセスを抽象化するリポジトリインターフェース。
 *
 * 【設計意図（保守性 / 将来のSupabase移行）】
 * すべてのメソッドを Promise ベースにしているのは、現状はLocalStorageのみで完結させつつも、
 * 将来 `DreamRepository` の実装を Supabase クライアント呼び出しに差し替えるだけで、
 * hooks/useDreams.tsx 以降のロジックを一切変更せずに済むようにするため。
 */
export interface DreamRepository {
  list(): Promise<Dream[]>;
  getById(id: string): Promise<Dream | undefined>;
  create(input: CreateDreamInput): Promise<Dream>;
  update(id: string, input: UpdateDreamInput): Promise<Dream>;
  /** AIによる整理結果を既存の夢へ保存する */
  saveOrganization(id: string, organization: DreamOrganization): Promise<Dream>;
  /** Dream Movie Packageを既存の夢へ保存する */
  saveMoviePackage(id: string, moviePackage: DreamMoviePackage): Promise<Dream>;
  remove(id: string): Promise<void>;
}

/**
 * 旧いMood分類から現行のMood型への変換テーブル。
 * 過去にLocalStorageへ保存されたデータが新しいMood型に存在しない値を持つ場合に用いる
 * 後方互換のためのフォールバック。
 *
 * - happy      → happy   （そのまま）
 * - peaceful   → neutral （「穏やか」に最も近い新分類として採用）
 * - strange    → mysterious（「不思議」相当）
 * - anxious    → neutral （新分類に「不安」の直接対応がないため中立に丸める。要PM確認）
 * - scary      → scary   （そのまま）
 * - sad        → sad     （そのまま）
 */
const LEGACY_MOOD_MAP: Record<string, Mood> = {
  happy: "happy",
  peaceful: "neutral",
  strange: "mysterious",
  anxious: "neutral",
  scary: "scary",
  sad: "sad",
  neutral: "neutral",
  mysterious: "mysterious",
};

function normalizeMood(rawMood: unknown): Mood {
  if (typeof rawMood === "string" && rawMood in LEGACY_MOOD_MAP) {
    return LEGACY_MOOD_MAP[rawMood];
  }
  return "neutral";
}

/** LocalStorageを使った永続化実装。アプリ再起動後もデータを保持する。 */
class LocalStorageDreamRepository implements DreamRepository {
  private readonly storageKey = DREAMS_STORAGE_KEY;

  private readAll(): Dream[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn("保存された夢データの形式が不正なため、空の状態として扱います。");
        return [];
      }
      // 過去に保存されたMood値が現行のMood型と異なる場合に備えて正規化する
      return (parsed as Dream[]).map((dream) => ({
        ...dream,
        mood: normalizeMood(dream.mood),
      }));
    } catch (error) {
      console.error("夢データの読み込みに失敗しました。", error);
      return [];
    }
  }

  private writeAll(dreams: Dream[]): void {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(dreams));
    } catch (error) {
      console.error("夢データの保存に失敗しました。", error);
      throw new Error(
        "夢を保存できませんでした。ブラウザのストレージ容量やプライベートモード設定をご確認ください。",
      );
    }
  }

  async list(): Promise<Dream[]> {
    return [...this.readAll()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getById(id: string): Promise<Dream | undefined> {
    return this.readAll().find((dream) => dream.id === id);
  }

  async create(input: CreateDreamInput): Promise<Dream> {
    const newDream: Dream = {
      id: generateDreamId(),
      title: input.title,
      body: input.body,
      mood: input.mood,
      createdAt: new Date().toISOString(),
      status: "recorded",
      score: generateDummyScore(),
    };

    const all = this.readAll();
    this.writeAll([newDream, ...all]);
    return newDream;
  }

  async update(id: string, input: UpdateDreamInput): Promise<Dream> {
    const all = this.readAll();
    const index = all.findIndex((dream) => dream.id === id);

    if (index === -1) {
      throw new Error("編集対象の夢が見つかりませんでした。");
    }

    const updated: Dream = {
      ...all[index],
      title: input.title,
      body: input.body,
      mood: input.mood,
      updatedAt: new Date().toISOString(),
    };

    const next = [...all];
    next[index] = updated;
    this.writeAll(next);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const all = this.readAll();
    this.writeAll(all.filter((dream) => dream.id !== id));
  }

  async saveOrganization(id: string, organization: DreamOrganization): Promise<Dream> {
    const all = this.readAll();
    const index = all.findIndex((dream) => dream.id === id);

    if (index === -1) {
      throw new Error("AI整理結果の保存対象となる夢が見つかりませんでした。");
    }

    const updated: Dream = {
      ...all[index],
      organization,
    };

    const next = [...all];
    next[index] = updated;
    this.writeAll(next);
    return updated;
  }

  async saveMoviePackage(id: string, moviePackage: DreamMoviePackage): Promise<Dream> {
    const all = this.readAll();
    const index = all.findIndex((dream) => dream.id === id);

    if (index === -1) {
      throw new Error("Movie Packageの保存対象となる夢が見つかりませんでした。");
    }

    const updated: Dream = {
      ...all[index],
      moviePackage,
    };

    const next = [...all];
    next[index] = updated;
    this.writeAll(next);
    return updated;
  }
}

/**
 * アプリ全体で単一インスタンスを共有するリポジトリ。
 * hooks/useDreams.tsx からのみ利用する想定。
 */
export const dreamRepository: DreamRepository = new LocalStorageDreamRepository();
