import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DreamMoviePackageResult } from "@/services/ai/types";

interface MoviePackageResultCardProps {
  moviePackage: DreamMoviePackageResult;
}

/**
 * Dream Movie Packageの詳細表示。
 * 映画タイトル/ジャンル/雰囲気/あらすじ/シーン一覧＋各シーンの画像Prompt・動画Promptを表示する。
 */
export function MoviePackageResultCard({ moviePackage }: MoviePackageResultCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{moviePackage.movieTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="gold">{moviePackage.genre}</Badge>
            <Badge variant="curtain">{moviePackage.mood}</Badge>
            <Badge variant="outline">{moviePackage.duration}秒</Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">あらすじ</span>
            <p className="text-sm leading-relaxed text-foreground/90">{moviePackage.synopsis}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold text-foreground">
          シーン一覧（全{moviePackage.scenes.length}シーン）
        </h3>
        {moviePackage.scenes.map((scene) => (
          <Card key={scene.sceneNumber}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  Scene{scene.sceneNumber}: {scene.title}
                </span>
                <Badge variant="outline">{scene.estimatedSeconds}秒</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Field label="描写">
                <p className="text-sm leading-relaxed text-foreground/90">{scene.description}</p>
              </Field>
              <Field label="ナレーション">
                <p className="text-sm leading-relaxed text-foreground/90">{scene.narration}</p>
              </Field>
              <Separator />
              <Field label="画像Prompt">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {scene.imagePrompt}
                </p>
              </Field>
              <Field label="動画Prompt">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {scene.videoPrompt}
                </p>
              </Field>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
