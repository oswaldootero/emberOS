import { PageHeader } from "@/components/shell/page-header";
import { StudioClient } from "@/components/studio/studio-client";
import { listPromptTemplates } from "@/server/ai/prompt-templates";

export const metadata = { title: "AI Content Studio" };

export default function StudioPage() {
  const templates = listPromptTemplates();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Content Studio"
        title="Light the ember."
        description="Tone-aware generation in the Heaven's Leaf voice. Stream in real time, review, schedule, ship."
      />
      <StudioClient templates={templates} />
    </div>
  );
}
