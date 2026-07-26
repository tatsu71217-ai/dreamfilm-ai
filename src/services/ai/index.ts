import { MockAIProvider } from "@/services/ai/MockAIProvider";
import type { AIProvider } from "@/services/ai/AIProvider";

/**
 * アプリ全体で使用する AIProvider の単一インスタンス。
 * 将来、実際のAIプロバイダーへ差し替える場合はこの1行を変更するだけで済む。
 */
export const aiProvider: AIProvider = new MockAIProvider();

export type { AIProvider } from "@/services/ai/AIProvider";
