import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Plug } from "lucide-react";
import { PushToggle } from "@/components/notifications/push-toggle";

export const metadata = { title: "Settings" };

const INTEGRATIONS = [
  { name: "Supabase", env: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
  { name: "OpenAI", env: ["OPENAI_API_KEY"] },
  { name: "Telegram Bot", env: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"] },
  { name: "WordPress", env: ["WORDPRESS_URL", "WORDPRESS_APP_PASSWORD"] },
  { name: "Resend (task emails)", env: ["RESEND_API_KEY", "EMAIL_FROM"] },
  { name: "Web Push (task notifications)", env: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"] },
  {
    name: "Meta (Instagram scouting)",
    env: ["META_ACCESS_TOKEN", "META_INSTAGRAM_BUSINESS_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"],
  },
];

function isSet(key: string) {
  return Boolean(process.env[key]);
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="The control room."
        description="Connection health for every integration EmberOS speaks with."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ember-300" /> Notifications on this device
          </CardTitle>
          <CardDescription>
            Task assignments and the morning due-list arrive as push notifications. Email goes out too when Resend is connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
          {!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
            <p className="text-xs text-muted-foreground">Push isn&apos;t configured yet — add the VAPID keys (see docs/TASKS.md).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-ember-300" /> Integrations
          </CardTitle>
          <CardDescription>
            Set the corresponding env vars in Vercel or .env.local to activate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 divide-y divide-white/[0.04]">
            {INTEGRATIONS.map((i) => {
              const allSet = i.env.every(isSet);
              const anySet = i.env.some(isSet);
              return (
                <div
                  key={i.name}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <div className="text-sm text-ivory">{i.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {i.env.join(" · ")}
                    </div>
                  </div>
                  <Badge
                    variant={allSet ? "success" : anySet ? "warning" : "outline"}
                  >
                    {allSet ? "Connected" : anySet ? "Partial" : "Not set"}
                  </Badge>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
                Open Vercel Env Manager
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
