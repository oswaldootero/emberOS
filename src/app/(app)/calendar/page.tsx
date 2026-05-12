import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content Calendar" };

async function loadCalendar() {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const posts = await prisma.scheduledPost.findMany({
      where: { scheduledFor: { gte: start, lt: end } },
      include: { content: { select: { title: true, type: true } } },
    });
    return { live: true, posts };
  } catch {
    return { live: false, posts: [] };
  }
}

export default async function CalendarPage() {
  const { live, posts } = await loadCalendar();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const startWeekday = firstDay.getDay();
  const cells: { date: number | null; key: string }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `pre-${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: d, key: `d-${d}` });

  const postsByDay = new Map<number, typeof posts>();
  for (const p of posts) {
    const day = new Date(p.scheduledFor).getDate();
    const list = postsByDay.get(day) ?? [];
    list.push(p);
    postsByDay.set(day, list);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calendar"
        title="The rhythm of the brand."
        description="Drag, drop, schedule. Campaigns grouped. AI posting recommendations integrated."
      >
        {!live && <Badge variant="warning">Demo view</Badge>}
        <Button variant="gold" size="sm">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-ember-300" />
            {today.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </CardTitle>
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
            {cells.map(({ date, key }) => {
              const items = date ? postsByDay.get(date) ?? [] : [];
              const isToday = date === today.getDate();
              return (
                <div
                  key={key}
                  className={`min-h-[110px] bg-ink-900/40 p-2 ${
                    isToday ? "ring-1 ring-ember-500/40" : ""
                  }`}
                >
                  {date && (
                    <div
                      className={`text-xs mb-1.5 ${
                        isToday ? "text-ember-300 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {date}
                    </div>
                  )}
                  <div className="space-y-1">
                    {items.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="text-[10px] truncate rounded bg-ember-500/10 border border-ember-500/20 px-1.5 py-1 text-ember-100"
                      >
                        {p.content?.title ?? "Untitled"}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
