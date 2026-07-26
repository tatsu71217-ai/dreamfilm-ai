import { isIOS } from "@/utils/device";

/**
 * navigator.share / navigator.canShare の最小限の型。
 * 環境のTypeScript DOM libバージョンに依存せず動作するよう、独自に定義している。
 */
interface ShareDataLike {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

type ShareCapableNavigator = Navigator & {
  share?: (data: ShareDataLike) => Promise<void>;
  canShare?: (data?: ShareDataLike) => boolean;
};

function getShareCapableNavigator(): ShareCapableNavigator | null {
  if (typeof navigator === "undefined") return null;
  return navigator as ShareCapableNavigator;
}

async function fetchAsFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("動画データの取得に失敗しました。ネットワーク接続をご確認ください。");
  }
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "video/mp4" });
}

/**
 * 生成された動画を端末へ保存する。
 *
 * WORK_ORDER (Sprint8) の「保存機能」要件に対応する。
 * - Android Chrome / デスクトップ: Blobを生成し `<a download>` を用いてダウンロードする
 * - iOS Safari: `<a download>` によるファイル保存は信頼性が低いため、共有シート
 *   （「ビデオを保存」を含む）経由での保存に委ねる
 */
export async function saveVideoToDevice(url: string, filename: string): Promise<void> {
  if (isIOS()) {
    await shareVideo(url, filename);
    return;
  }

  const file = await fetchAsFile(url, filename);
  const objectUrl = URL.createObjectURL(file);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 共有シートを開いて動画を共有する。
 *
 * WORK_ORDER (Sprint8) の「共有」要件に対応する。LINE/X/Instagram等、個別のアプリへ
 * 直接連携するのではなく、標準の Web Share API（OSの共有シート）を経由する実装とした。
 * どのアプリが選択肢に表示されるかはOS・端末の設定に依存する。
 */
export async function shareVideo(url: string, filename: string): Promise<void> {
  const shareNavigator = getShareCapableNavigator();

  if (!shareNavigator || typeof shareNavigator.share !== "function") {
    throw new Error("この端末・ブラウザは共有機能に対応していません。");
  }

  try {
    const file = await fetchAsFile(url, filename);
    if (shareNavigator.canShare?.({ files: [file] })) {
      await shareNavigator.share({ files: [file], title: "DreamFilm AI" });
      return;
    }
  } catch (error) {
    // ファイル共有に失敗した場合は、URL共有へフォールバックする
    console.warn("ファイル共有に失敗したため、URL共有にフォールバックします。", error);
  }

  await shareNavigator.share({ title: "DreamFilm AI", url });
}
