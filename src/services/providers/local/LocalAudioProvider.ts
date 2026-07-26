import type { AudioProvider } from "@/services/providers/types";
import { createAudioTrack } from "@/services/render/engine/audioEngine";
import type { AudioAsset } from "@/types/asset";
import type { AudioProfile } from "@/types/style";

/**
 * Web Audioのオシレーター・ノイズだけでBGMとSEを合成する既定実装。
 * 音源ファイルを持たないため、オフラインでも常に音付きの動画を生成できる。
 */
export const localAudioProvider: AudioProvider = {
  kind: "audio",
  id: "local-audio",
  createTrack(profile: AudioProfile, soundEffects: AudioAsset[], totalSeconds: number) {
    return createAudioTrack(profile, soundEffects, totalSeconds);
  },
};
