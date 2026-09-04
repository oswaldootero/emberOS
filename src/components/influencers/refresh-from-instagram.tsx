"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshInfluencerFromInstagram } from "@/server/actions/social";
import { fmtFollowers } from "./stage-badge";

export function RefreshFromInstagram({ influencerId }: { influencerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshInfluencerFromInstagram(influencerId);
          if (!r.ok) { toast.error(r.error); return; }
          toast.success(
            `Refreshed — ${fmtFollowers(r.followerCount)} followers${r.engagementRate != null ? `, ${r.engagementRate}% engagement` : ""}.`,
          );
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Refresh from Instagram
    </Button>
  );
}
