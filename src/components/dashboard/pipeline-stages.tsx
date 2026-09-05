const LABEL: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  MEETING_SCHEDULED: "Meeting set",
  MEETING_COMPLETED: "Met",
  SAMPLES_DELIVERED: "Samples out",
  NEGOTIATION: "Negotiating",
};

/** Magnitude by stage: one hue, length encodes count, labels carry the numbers. */
export function PipelineStages({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No open prospects. Find some on the scouting pages.</p>;
  }
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.stage} className="flex items-center gap-3 text-xs">
          <span className="w-24 shrink-0 text-muted-foreground">{LABEL[d.stage] ?? d.stage}</span>
          <span className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <span
              className="block h-full rounded-full bg-ember-500/70"
              style={{ width: `${Math.max(d.count > 0 ? 4 : 0, (d.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-6 text-right tabular-nums text-ivory">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}
