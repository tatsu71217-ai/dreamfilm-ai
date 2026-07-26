import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * clsx + tailwind-merge を組み合わせたクラス名結合ユーティリティ。
 * shadcn/ui の各コンポーネントで標準的に使われるパターン。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
