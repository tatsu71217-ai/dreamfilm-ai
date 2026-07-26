/**
 * MotionLibraryが扱うモーションの識別子。
 * 人物・動物・オブジェクトいずれのキャラクターにも同じプリセット集合を適用する
 * （見た目の違いは CharacterAsset.variant 側で表現し、動きの質はここで一元管理する）。
 */
export type MotionId = "walk" | "run" | "jump" | "turn" | "idle" | "float" | "fly" | "swim";
