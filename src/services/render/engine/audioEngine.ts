/**
 * AudioEngine: スタイルのBGMパラメータとシーン切り替えSEをWeb Audioで合成し、
 * MediaRecorderに渡せる MediaStream（音声トラック）として書き出す。
 *
 * 音源ファイルは一切使わず、オシレーター・ノイズ・ディレイ(疑似リバーブ)だけで構成する
 * （services/scene/sceneSplitter.ts の語彙マッチと同様、外部アセット無しで
 *  演出の幅を出すという本プロジェクト全体の方針に合わせている）。
 */

import type { AudioAsset, SoundEffectVariant } from "@/types/asset";
import type { AudioProfile } from "@/types/style";

export interface AudioTrackHandle {
  /** captureStream()の映像トラックと合成してMediaRecorderへ渡す音声ストリーム */
  stream: MediaStream;
  /** AudioContextを停止・解放する。録画終了後に必ず呼ぶこと */
  stop(): void;
}

/** BGMの1音の長さ（拍から算出する基準単位。8分音符相当） */
function noteSeconds(tempoBpm: number): number {
  return 60 / tempoBpm / 2;
}

/** 半音オフセットを周波数へ変換する */
function semitoneToFrequency(rootFrequency: number, semitones: number): number {
  return rootFrequency * Math.pow(2, semitones / 12);
}

/** ノイズ（ホワイトノイズ）バッファを1つ作って使い回す */
function createNoiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * スタイルのBGMプロファイルとシーン切り替えSEから、録画尺ぶんの音声を合成して再生する。
 * 呼び出し側（videoRecorder）は返された stream を canvas の映像トラックと合成する。
 */
export function createAudioTrack(
  profile: AudioProfile,
  soundEffects: AudioAsset[],
  totalSeconds: number,
): AudioTrackHandle {
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextCtor();
  const destination = ctx.createMediaStreamDestination();

  const master = ctx.createGain();
  master.gain.value = profile.gain;

  // 疑似リバーブ: フィードバック付きディレイで残響感を近似する
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = profile.reverb;
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.18;
  const feedback = ctx.createGain();
  feedback.gain.value = Math.min(0.85, profile.reverb);
  delay.connect(feedback);
  feedback.connect(delay);

  master.connect(destination);
  reverbSend.connect(delay);
  delay.connect(master);

  const activeNodes: Array<OscillatorNode | AudioBufferSourceNode> = [];

  playBgm(ctx, master, reverbSend, profile, totalSeconds, activeNodes);

  if (profile.noiseLevel > 0) {
    playNoiseBed(ctx, master, profile, totalSeconds, activeNodes);
  }

  for (const se of soundEffects) {
    scheduleSoundEffect(ctx, master, se, activeNodes);
  }

  return {
    stream: destination.stream,
    stop: () => {
      for (const node of activeNodes) {
        try {
          node.stop();
        } catch {
          // 既に停止済みのノードは無視する
        }
      }
      void ctx.close();
    },
  };
}

function playBgm(
  ctx: BaseAudioContext,
  master: GainNode,
  reverbSend: GainNode,
  profile: AudioProfile,
  totalSeconds: number,
  activeNodes: Array<OscillatorNode | AudioBufferSourceNode>,
): void {
  const step = noteSeconds(profile.tempoBpm);
  const noteCount = Math.ceil(totalSeconds / step);
  const scale = profile.scaleSemitones.length > 0 ? profile.scaleSemitones : [0];

  for (let i = 0; i < noteCount; i += 1) {
    const startTime = ctx.currentTime + i * step;
    const semitone = scale[i % scale.length];
    const octaveShift = Math.floor(i / scale.length) % 2 === 0 ? 0 : 12;
    const frequency = semitoneToFrequency(profile.rootFrequency, semitone + octaveShift);

    const osc = ctx.createOscillator();
    osc.type = profile.waveform;
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    const peak = 0.18;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + step * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + step * 0.95);

    osc.connect(gain);
    gain.connect(master);
    gain.connect(reverbSend);

    osc.start(startTime);
    osc.stop(startTime + step);
    activeNodes.push(osc);
  }

  if (profile.drone) {
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = profile.rootFrequency / 2;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.06;
    drone.connect(droneGain);
    droneGain.connect(master);
    droneGain.connect(reverbSend);
    drone.start(ctx.currentTime);
    drone.stop(ctx.currentTime + totalSeconds + 0.5);
    activeNodes.push(drone);
  }
}

function playNoiseBed(
  ctx: BaseAudioContext,
  master: GainNode,
  profile: AudioProfile,
  totalSeconds: number,
  activeNodes: Array<OscillatorNode | AudioBufferSourceNode>,
): void {
  const buffer = createNoiseBuffer(ctx, Math.min(4, totalSeconds));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = profile.noiseLevel * 0.25;

  source.connect(gain);
  gain.connect(master);

  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + totalSeconds + 0.5);
  activeNodes.push(source);
}

const SOUND_EFFECT_PARAMS: Record<
  SoundEffectVariant,
  { frequency: number; duration: number; type: OscillatorType }
> = {
  whoosh: { frequency: 320, duration: 0.4, type: "sawtooth" },
  impact: { frequency: 90, duration: 0.25, type: "square" },
  chime: { frequency: 1046, duration: 0.6, type: "sine" },
  heartbeat: { frequency: 60, duration: 0.3, type: "sine" },
  pop: { frequency: 660, duration: 0.12, type: "triangle" },
};

function scheduleSoundEffect(
  ctx: BaseAudioContext,
  master: GainNode,
  asset: AudioAsset,
  activeNodes: Array<OscillatorNode | AudioBufferSourceNode>,
): void {
  const params = SOUND_EFFECT_PARAMS[asset.variant];
  const startTime = ctx.currentTime + Math.max(0, asset.atTime);

  const osc = ctx.createOscillator();
  osc.type = params.type;
  osc.frequency.setValueAtTime(params.frequency, startTime);
  if (asset.variant === "whoosh") {
    osc.frequency.exponentialRampToValueAtTime(params.frequency * 0.4, startTime + params.duration);
  }
  if (asset.variant === "heartbeat") {
    osc.frequency.setValueAtTime(params.frequency, startTime + params.duration * 0.5);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(asset.gain, startTime + params.duration * 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + params.duration);

  osc.connect(gain);
  gain.connect(master);

  osc.start(startTime);
  osc.stop(startTime + params.duration + 0.05);
  activeNodes.push(osc);
}
