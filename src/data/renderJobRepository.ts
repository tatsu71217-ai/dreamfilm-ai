import {
  RENDER_JOBS_STORAGE_KEY,
  type CreateRenderJobInput,
  type RenderJob,
} from "@/types/render";
import { generateId } from "@/utils/id";

/**
 * RenderJobデータへのアクセスを抽象化するリポジトリインターフェース。
 *
 * WORK_ORDER (Sprint6) は保存対象として「RenderJob」と「RenderHistory」の両方を挙げているが、
 * 本実装ではこれらを1つのコレクションとして扱っている。
 * 「現在のジョブの状態」も「過去の履歴」も、本質的には同じ RenderJob の集合に対する
 * 異なる見方（1件取得 vs 一覧取得）に過ぎないと判断したためである
 * （詳細は SPRINT_REPORT.md の懸念事項を参照。将来的に履歴の保持件数やアーカイブ方針が
 *  必要になった場合は、このリポジトリの実装のみを変更すればよい）。
 *
 * data/dreamRepository.ts と同様、Promise ベースのインターフェースにすることで、
 * 将来Supabase等へ差し替える際もUI層のコードを変更せずに済むようにしている。
 */
export interface RenderJobRepository {
  /** 作成日時の新しい順で全件取得する。Render履歴画面で使用 */
  list(): Promise<RenderJob[]>;
  getById(id: string): Promise<RenderJob | undefined>;
  listByDreamId(dreamId: string): Promise<RenderJob[]>;
  create(input: CreateRenderJobInput): Promise<RenderJob>;
  update(id: string, patch: Partial<Omit<RenderJob, "id">>): Promise<RenderJob>;
  /** Sprint8で追加: Render履歴から1件削除する */
  remove(id: string): Promise<void>;
}

class LocalStorageRenderJobRepository implements RenderJobRepository {
  private readonly storageKey = RENDER_JOBS_STORAGE_KEY;

  private readAll(): RenderJob[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn(
          "保存されたレンダリングジョブの形式が不正なため、空の状態として扱います。",
        );
        return [];
      }
      return parsed as RenderJob[];
    } catch (error) {
      console.error("レンダリングジョブの読み込みに失敗しました。", error);
      return [];
    }
  }

  private writeAll(jobs: RenderJob[]): void {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(jobs));
    } catch (error) {
      console.error("レンダリングジョブの保存に失敗しました。", error);
      throw new Error(
        "レンダリングジョブを保存できませんでした。ブラウザのストレージ容量をご確認ください。",
      );
    }
  }

  async list(): Promise<RenderJob[]> {
    return [...this.readAll()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getById(id: string): Promise<RenderJob | undefined> {
    return this.readAll().find((job) => job.id === id);
  }

  async listByDreamId(dreamId: string): Promise<RenderJob[]> {
    return this.readAll().filter((job) => job.dreamId === dreamId);
  }

  async create(input: CreateRenderJobInput): Promise<RenderJob> {
    const job: RenderJob = { id: generateId(), ...input };
    const all = this.readAll();
    this.writeAll([job, ...all]);
    return job;
  }

  async update(id: string, patch: Partial<Omit<RenderJob, "id">>): Promise<RenderJob> {
    const all = this.readAll();
    const index = all.findIndex((job) => job.id === id);

    if (index === -1) {
      throw new Error("対象のレンダリングジョブが見つかりませんでした。");
    }

    const updated: RenderJob = { ...all[index], ...patch };
    const next = [...all];
    next[index] = updated;
    this.writeAll(next);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const all = this.readAll();
    this.writeAll(all.filter((job) => job.id !== id));
  }
}

/**
 * アプリ全体で単一インスタンスを共有するリポジトリ。
 * services/render/RenderService.ts からのみ利用する想定。
 */
export const renderJobRepository: RenderJobRepository = new LocalStorageRenderJobRepository();
