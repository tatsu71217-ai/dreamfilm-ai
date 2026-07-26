import { Badge } from "@/components/ui/badge";
import { RENDER_STATUS_LABEL, type RenderStatus } from "@/types/render";

interface RenderStatusBadgeProps {
  status: RenderStatus;
}

const STATUS_VARIANT: Record<RenderStatus, "default" | "gold" | "curtain" | "outline"> = {
  waiting: "default",
  preparing: "default",
  rendering: "gold",
  completed: "gold",
  failed: "curtain",
  cancelled: "outline",
};

export function RenderStatusBadge({ status }: RenderStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{RENDER_STATUS_LABEL[status]}</Badge>;
}
