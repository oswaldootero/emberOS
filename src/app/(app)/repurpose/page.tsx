import { PageHeader } from "@/components/shell/page-header";
import { RepurposeClient } from "@/components/repurpose/repurpose-client";

export const metadata = { title: "Repurpose Engine" };

export default function RepurposePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Repurpose Engine"
        title="One ember, every channel."
        description="Take any source — blog, transcript, voice note — and shape it for every surface in seconds."
      />
      <RepurposeClient />
    </div>
  );
}
