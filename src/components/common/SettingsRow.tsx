import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface SettingsRowProps {
  icon: ReactNode;
  label: string;
  description?: string;
  /** タップ可能な行の場合に指定 (例: 規約表示) */
  onClick?: () => void;
  /** 画面遷移させたい場合に指定 (例: レンダリング履歴)。onClickと排他的に使う想定 */
  to?: string;
  /** 行の右側に表示する任意の要素（例: テーマ切替スイッチ） */
  trailing?: ReactNode;
  className?: string;
}

/**
 * 設定画面の1行を表す共通コンポーネント。
 *
 * - to指定あり: <Link> として画面遷移させる（Sprint6で追加）
 * - onClick指定あり: <button> としてタップ可能にする（例: 規約表示ダイアログ）
 * - どちらもなし: <div>（例: スイッチ内蔵の行）
 *
 * ネイティブ要素のprop型がbutton/div/aで異なるため、動的タグ名ではなく分岐で実装し、
 * 型安全性を保っている。
 */
export function SettingsRow({
  icon,
  label,
  description,
  onClick,
  to,
  trailing,
  className,
}: SettingsRowProps) {
  const isNavigable = typeof to === "string";
  const isInteractive = isNavigable || typeof onClick === "function";

  const rowClassName = cn(
    "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left",
    isInteractive &&
      "transition-colors hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className,
  );

  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-gold">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {trailing ?? (isInteractive && <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
    </>
  );

  if (isNavigable) {
    return (
      <Link to={to} className={rowClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}
