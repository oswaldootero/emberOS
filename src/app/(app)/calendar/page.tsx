import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCalendarMonth,
  type CalendarEvent,
} from "@/server/calendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content Calendar" };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SOURCE_ICON: Record<CalendarEvent["source"], React.ComponentType<{ className?: string }>> = {
  WORDPRESS: Globe,
  TELEGRAM: Send,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  INTERNAL: Sparkles,
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month =
    params.month != null ? Number(params.month) : now.getMonth();

  const data = await getCalendarMonth(year, month);

  // Build the day cells (zero-indexed Sunday = 0)
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: { day: number | null; key: string }[] = [];
  for (let i = 0; i < startWeekday; i++)
    cells.push({ day: null, key: `pre-${i}` });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, key: `d-${d}` });

  // Group events by day
  const byDay = new Map<number, CalendarEvent[]>();
  for (const e of data.events) {
    const ed = new Date(e.date);
    if (ed.getFullYear() !== year || ed.getMonth() !== month) continue;
    const day = ed.getDate();
    const arr = byDay.get(day) ?? [];
    arr.push(e);
    byDay.set(day, arr);
  }

  // Navigation
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const todayDay = isCurrentMonth ? now.getDate() : -1;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calendar"
        title="The rhythm of the brand."
        description="Unified view of WordPress, Telegram, Instagram, Facebook, and internal schedule — past, present, and future."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/calendar?year=${prevYear}&month=${prevMonth}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/calendar">Today</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/calendar?year=${nextYear}&month=${nextMonth}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/studio">
            <Plus className="h-4 w-4" /> New Content
          </Link>
        </Button>
      </PageHeader>

      {/* Month header + counts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-ember-300" />
            {MONTH_NAMES[month]} {year}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
            <Badge variant="success" className="text-[10px]">
              {data.counts.published} published
            </Badge>
            <Badge variant="gold" className="text-[10px]">
              {data.counts.scheduled} scheduled
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {data.counts.drafts} drafts
            </Badge>
            <span className="opacity-50">·</span>
            <span>{data.events.length} total events</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-white/[0.04] rounded-lg overflow-hidden border border-white/[0.04]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="bg-ink-900 text-[10px] uppercase tracking-wider text-muted-foreground p-2 text-center"
              >
                {d}
              </div>
            ))}
            {cells.map(({ day, key }) => {
              const items = day ? byDay.get(day) ?? [] : [];
              const isToday = day === todayDay;
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[120px] bg-ink-900/40 p-2 space-y-1.5",
                    isToday && "ring-1 ring-ember-500/40",
                  )}
                >
                  {day && (
                    <div
                      className={cn(
                        "text-xs mb-1",
                        isToday
                          ? "text-ember-300 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {day}
                    </div>
                  )}
                  {items.slice(0, 4).map((e) => (
                    <EventChip key={e.id} event={e} />
                  ))}
                  {items.length > 4 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{items.length - 4} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <LegendEntry status="published" label="Published" hint="Live now" />
            <LegendEntry status="scheduled" label="Scheduled" hint="Future publish" />
            <LegendEntry status="queued" label="In queue" hint="EmberOS internal" />
            <LegendEntry status="draft" label="Draft" hint="Not published" />
            <LegendEntry status="pending" label="Pending review" hint="Awaiting approval" />
            <LegendEntry status="failed" label="Failed" hint="Needs attention" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Sources:</span>
            <SourceLegend source="WORDPRESS" label="WordPress" />
            <SourceLegend source="TELEGRAM" label="Telegram" />
            <SourceLegend source="INSTAGRAM" label="Instagram" />
            <SourceLegend source="FACEBOOK" label="Facebook" />
            <SourceLegend source="INTERNAL" label="EmberOS" />
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {data.events.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-2">
            <CalendarDays className="h-7 w-7 text-muted-foreground mx-auto" />
            <div className="text-sm text-ivory">
              No events in {MONTH_NAMES[month]} {year}.
            </div>
            <div className="text-xs text-muted-foreground max-w-md mx-auto">
              The calendar shows WordPress posts (any status), internal
              scheduled posts, and historical Instagram / Facebook posts from
              your imports. Try a different month with the arrow buttons above.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EventChip({ event }: { event: CalendarEvent }) {
  const Icon = SOURCE_ICON[event.source];
  const tone = statusClasses(event.status);

  const inner = (
    <div
      className={cn(
        "rounded border px-1.5 py-1 flex items-center gap-1 text-[10px] truncate",
        tone,
      )}
      title={`${event.title} · ${event.status}`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{event.title}</span>
    </div>
  );

  if (event.url) {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function LegendEntry({
  status,
  label,
  hint,
}: {
  status: CalendarEvent["status"];
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 rounded border", statusClasses(status))} />
      <div>
        <div className="text-ivory">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function SourceLegend({
  source,
  label,
}: {
  source: CalendarEvent["source"];
  label: string;
}) {
  const Icon = SOURCE_ICON[source];
  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/[0.06] bg-ink-900/40 px-1.5 py-0.5">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function statusClasses(status: CalendarEvent["status"]): string {
  switch (status) {
    case "published":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "scheduled":
      return "border-ember-500/30 bg-ember-500/15 text-ember-200";
    case "queued":
      return "border-tobacco-400/30 bg-tobacco-500/15 text-tobacco-100";
    case "draft":
      return "border-white/[0.08] bg-ink-700 text-muted-foreground";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-white/[0.08] bg-ink-700 text-muted-foreground";
  }
}
