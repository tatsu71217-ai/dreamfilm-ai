import { Badge } from "@/components/ui/badge";
import { DREAM_STATUS_LABEL, type DreamStatus } from "@/types/dream";

interface StatusBadgeProps {
  status: DreamStatus;
}

const STATUS_VARIANT: Record<DreamStatus, "default" | "gold" | "curtain"> = {
  recorded: "default",
  scored: "gold",
  queued: "curtain",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{DREAM_STATUS_LABEL[status]}</Badge>;
}
