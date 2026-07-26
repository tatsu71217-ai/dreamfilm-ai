import * as React from "react";
import { Moon, Sun, Info, FileText, ShieldCheck, Film } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SettingsRow } from "@/components/common/SettingsRow";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoProviderSettingsCard } from "@/components/common/VideoProviderSettingsCard";
import { useTheme } from "@/hooks/useTheme";

const APP_VERSION = "0.1.0";

type InfoDialogKey = "app" | "terms" | "privacy" | null;

const INFO_DIALOG_CONTENT: Record<
  Exclude<InfoDialogKey, null>,
  { title: string; description: string }
> = {
  app: {
    title: "DreamFilm AI について",
    description: `バージョン ${APP_VERSION}\n見た夢を記録し、いつか映画のように振り返るための体験アプリです。`,
  },
  terms: {
    title: "利用規約",
    description: "現在プレースホルダーの内容です。正式な利用規約は今後追加されます。",
  },
  privacy: {
    title: "プライバシーポリシー",
    description: "現在プレースホルダーの内容です。正式なプライバシーポリシーは今後追加されます。",
  },
};

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [openDialog, setOpenDialog] = React.useState<InfoDialogKey>(null);
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="設定" showBack={false} />

      <div className="flex flex-col gap-6 px-5 py-6">
        <section className="flex flex-col gap-3" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-sm font-medium text-muted-foreground">
            外観
          </h2>
          <SettingsRow
            icon={
              isDark ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )
            }
            label="ダークモード"
            description={isDark ? "劇場のような暗い配色" : "明るい紙のような配色"}
            trailing={
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                aria-label="ダークモードを切り替える"
              />
            }
          />
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="video-provider-heading">
          <h2 id="video-provider-heading" className="text-sm font-medium text-muted-foreground">
            動画生成
          </h2>
          <VideoProviderSettingsCard />
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-medium text-muted-foreground">
            履歴
          </h2>
          <SettingsRow
            icon={<Film className="h-4 w-4" aria-hidden="true" />}
            label="レンダリング履歴"
            description="動画生成（Render）ジョブの履歴を見る"
            to="/render-history"
          />
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-sm font-medium text-muted-foreground">
            アプリについて
          </h2>
          <div className="flex flex-col gap-2.5">
            <SettingsRow
              icon={<Info className="h-4 w-4" aria-hidden="true" />}
              label="アプリ情報"
              description={`バージョン ${APP_VERSION}`}
              onClick={() => setOpenDialog("app")}
            />
            <SettingsRow
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              label="利用規約"
              onClick={() => setOpenDialog("terms")}
            />
            <SettingsRow
              icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              label="プライバシーポリシー"
              onClick={() => setOpenDialog("privacy")}
            />
          </div>
        </section>
      </div>

      <Dialog open={openDialog !== null} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          {openDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{INFO_DIALOG_CONTENT[openDialog].title}</DialogTitle>
                <DialogDescription className="whitespace-pre-line">
                  {INFO_DIALOG_CONTENT[openDialog].description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="primary" className="w-full sm:w-auto">
                    閉じる
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
