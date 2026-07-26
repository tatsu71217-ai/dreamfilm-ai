import type { CreateDreamInput, DreamScore, Mood } from "@/types/dream";
import { generateId } from "@/utils/id";

/**
 * 一意なID文字列を生成する。
 * Movie Package/RenderJob等、他のモデルとも共通の utils/id.ts の実装を利用する。
 */
export function generateDreamId(): string {
  return generateId();
}

/**
 * ダミーの Dream Score を生成する。
 *
 * TODO: 実際のAI分析エンジンによるスコアリングに置き換える。
 * 現時点では「記録した直後でもDetail画面が意味のある見た目になる」ことを目的とした
 * 疑似乱数によるダミー実装。
 */
export function generateDummyScore(): DreamScore {
  const randomInRange = (min: number, max: number) =>
    Math.round(min + Math.random() * (max - min));

  return {
    cinematic: randomInRange(55, 95),
    emotion: randomInRange(50, 95),
    story: randomInRange(50, 90),
    wonder: randomInRange(60, 98),
  };
}

export interface DreamFormValues {
  title: string;
  body: string;
  mood: Mood | null;
}

export type DreamFormErrors = Partial<Record<keyof DreamFormValues, string>>;

const TITLE_MAX_LENGTH = 40;
const BODY_MAX_LENGTH = 2000;

/** Dream Record画面の入力チェック用の共通バリデーション関数。 */
export function validateDreamForm(values: DreamFormValues): DreamFormErrors {
  const errors: DreamFormErrors = {};

  const trimmedTitle = values.title.trim();
  if (trimmedTitle.length === 0) {
    errors.title = "タイトルを入力してください。";
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください。`;
  }

  const trimmedBody = values.body.trim();
  if (trimmedBody.length === 0) {
    errors.body = "本文を入力してください。";
  } else if (trimmedBody.length > BODY_MAX_LENGTH) {
    errors.body = `本文は${BODY_MAX_LENGTH}文字以内で入力してください。`;
  }

  if (values.mood === null) {
    errors.mood = "気分を選択してください。";
  }

  return errors;
}

export function isDreamFormValid(values: DreamFormValues): values is {
  title: string;
  body: string;
  mood: Mood;
} {
  return Object.keys(validateDreamForm(values)).length === 0;
}

/**
 * バリデーション済みの値を CreateDreamInput に変換する。
 * isDreamFormValid で true が確定した後にのみ呼び出すこと。
 */
export function toCreateDreamInput(values: {
  title: string;
  body: string;
  mood: Mood;
}): CreateDreamInput {
  return {
    title: values.title.trim(),
    body: values.body.trim(),
    mood: values.mood,
  };
}
