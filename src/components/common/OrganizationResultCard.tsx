import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DreamOrganizationResult } from "@/services/ai/types";

interface OrganizationResultCardProps {
  result: DreamOrganizationResult;
  /** カード見出し。整理画面での確認表示とDetail画面での保存済み表示で文言を出し分ける */
  title?: string;
}

/**
 * AI整理結果（タイトル案/要約/キーワード/感情/登場人物/場所）の表示。
 * DreamOrganizePage（生成直後のプレビュー）とDreamDetailPage（保存済みの表示）の両方で使用する。
 */
export function OrganizationResultCard({
  result,
  title = "AI整理結果",
}: OrganizationResultCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="タイトル案">
          <p className="font-display text-base text-foreground">{result.title}</p>
        </Field>

        <Field label="要約">
          <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
        </Field>

        <Field label="キーワード">
          {result.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.keywords.map((keyword) => (
                <Badge key={keyword} variant="gold">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyValue />
          )}
        </Field>

        <Field label="感情">
          <Badge variant="curtain">{result.emotion}</Badge>
        </Field>

        <Field label="登場人物">
          {result.characters.length > 0 ? (
            <p className="text-sm text-foreground/90">{result.characters.join(" / ")}</p>
          ) : (
            <EmptyValue />
          )}
        </Field>

        <Field label="場所">
          {result.places.length > 0 ? (
            <p className="text-sm text-foreground/90">{result.places.join(" / ")}</p>
          ) : (
            <EmptyValue />
          )}
        </Field>
      </CardContent>
    </Card>
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

function EmptyValue() {
  return <p className="text-sm text-muted-foreground">特定できませんでした</p>;
}
