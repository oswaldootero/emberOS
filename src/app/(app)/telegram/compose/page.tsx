import Link from "next/link";
import { ArrowLeft, Bot, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BroadcastComposer } from "@/components/telegram/broadcast-composer";
import { isConfigured as telegramIsConfigured } from "@/server/integrations/telegram";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Compose Broadcast" };
export const dynamic = "force-dynamic";

export default async function ComposeBroadcastPage() {
  await requireUser();

  if (!telegramIsConfigured()) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Telegram · Compose"
          title="Send a broadcast"
          description="The bot isn't connected yet."
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/telegram">
              <ArrowLeft className="h-4 w-4" /> Back to Telegram
            </Link>
          </Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Telegram bot not configured
            </CardTitle>
            <CardDescription>
              Set TELEGRAM_BOT_TOKEN + TELEGRAM_DEFAULT_CHAT_ID +
              TELEGRAM_WEBHOOK_SECRET in Vercel, redeploy, then come back.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const chatLabel = env.TELEGRAM_DEFAULT_CHAT_ID
    ? `chat ${env.TELEGRAM_DEFAULT_CHAT_ID}`
    : "default brotherhood chat";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Telegram · Compose"
        title="Send a broadcast"
        description="Compose a message to the brotherhood — straight to the bot's connected chat."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/telegram">
            <ArrowLeft className="h-4 w-4" /> Back to Telegram
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="h-3.5 w-3.5 text-ember-300" />
        Posting as{" "}
        <code className="text-ember-200">
          @{env.TELEGRAM_BOT_USERNAME ?? "HeavensLeafBrotherhoodBot"}
        </code>
        <span className="opacity-50">·</span>
        <span>{chatLabel}</span>
      </div>

      <BroadcastComposer chatLabel={chatLabel} />
    </div>
  );
}
