import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Instagram, Send, Youtube, Globe } from "lucide-react";
import { relativeTime } from "@/lib/utils";

const platformIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  INSTAGRAM: Instagram,
  TELEGRAM: Send,
  YOUTUBE: Youtube,
  WORDPRESS: Globe,
};

export type QueueItem = {
  id: string;
  title: string;
  platform: keyof typeof platformIcon | string;
  scheduledFor: string;
  status: "QUEUED" | "PROCESSING" | "FAILED";
};

export function UpcomingQueue({ items }: { items: QueueItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-ember-300" />
          Upcoming Queue
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">
          {items.length} scheduled
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No posts scheduled yet. Open the AI Studio to draft one.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {items.map((item) => {
              const Icon = platformIcon[item.platform] ?? CalendarClock;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="h-9 w-9 rounded-md bg-ink-700 border border-white/[0.04] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-ember-300/90" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ivory truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.platform.toLowerCase()} ·{" "}
                      {relativeTime(item.scheduledFor)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.status === "FAILED"
                        ? "destructive"
                        : item.status === "PROCESSING"
                          ? "warning"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {item.status.toLowerCase()}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
