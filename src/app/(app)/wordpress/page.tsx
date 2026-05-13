import Link from "next/link";
import {
  ExternalLink,
  FileText,
  Globe,
  Plus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
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
import { loadWordPressSnapshot } from "@/server/wordpress";

export const metadata = { title: "WordPress" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<
  string,
  "success" | "gold" | "warning" | "outline" | "destructive"
> = {
  publish: "success",
  future: "gold",
  pending: "warning",
  draft: "outline",
  private: "outline",
  trash: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  publish: "Published",
  future: "Scheduled",
  pending: "Pending review",
  draft: "Draft",
  private: "Private",
  trash: "Trashed",
};

export default async function WordPressPage() {
  const snapshot = await loadWordPressSnapshot();

  if (snapshot.state === "not_configured") {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="WordPress"
          title="Long-form. Indexed. Owned."
          description="Connect a WordPress site to publish from EmberOS."
        />
        <NotConfiguredCard missingVars={snapshot.missingVars} />
      </div>
    );
  }

  if (snapshot.state === "connection_error") {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="WordPress"
          title="Long-form. Indexed. Owned."
          description="WordPress is configured but unreachable."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Connection error
            </CardTitle>
            <CardDescription>{snapshot.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Confirm <code className="text-ember-200">WORDPRESS_URL</code> is
            reachable and that{" "}
            <code className="text-ember-200">WORDPRESS_USERNAME</code> +{" "}
            <code className="text-ember-200">WORDPRESS_APP_PASSWORD</code>{" "}
            authenticate via the WordPress REST API. App Passwords are
            generated at Users → Profile → Application Passwords on your
            WordPress dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { site, stats, posts } = snapshot;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="WordPress"
        title={site.name || "Long-form. Indexed. Owned."}
        description={
          site.description ||
          "Publish drafts, schedule articles, manage SEO meta — all from here."
        }
      >
        <Button variant="outline" size="sm" asChild>
          <a href={site.url} target="_blank" rel="noopener noreferrer">
            <Globe className="h-4 w-4" /> Open Site
          </a>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/wordpress/new">
            <Plus className="h-4 w-4" /> New Article
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Published"
          value={stats.publish}
          accent="text-emerald-300"
        />
        <StatCard label="Scheduled" value={stats.future} accent="text-ember-300" />
        <StatCard
          label="Drafts"
          value={stats.draft}
          accent="text-muted-foreground"
        />
        <StatCard
          label="Pending review"
          value={stats.pending}
          accent="text-amber-300"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ember-300" /> Recent Articles
            </CardTitle>
            <CardDescription>
              Latest {posts.length} from {site.url.replace(/^https?:\/\//, "")}
            </CardDescription>
          </div>
          <Badge variant="success" className="text-[10px]">
            Connected
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {posts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No posts yet — draft your first one from the AI Studio.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ivory truncate">
                      {p.title || "(untitled)"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.excerpt || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(p.date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      ·{" "}
                      <span className="font-mono">/{p.slug}</span>
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_VARIANT[p.status] ?? "outline"}
                    className="text-[10px] shrink-0"
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open in WordPress"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ember-300" />
            AI-Assisted Workflow
          </CardTitle>
          <CardDescription>Two ways to publish from EmberOS.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <FlowStep
            num="1"
            title="Generate in the Studio"
            body="Open AI Content Studio → SEO Article → write topic → strike the match. Copy the markdown."
            href="/studio"
            cta="Open Studio"
          />
          <FlowStep
            num="2"
            title="Compose & publish here"
            body="Paste into the composer, set Yoast meta + slug + schedule, then ship as draft, scheduled, or published."
            href="/wordpress/new"
            cta="New Article"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`font-display text-3xl ${accent ?? "text-ivory"} tabular-nums`}
        >
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function FlowStep({
  num,
  title,
  body,
  href,
  cta,
}: {
  num: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-ember-500/15 border border-ember-500/30 flex items-center justify-center text-xs text-ember-200 font-mono">
          {num}
        </div>
        <div className="font-medium text-ivory">{title}</div>
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

function NotConfiguredCard({ missingVars }: { missingVars: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          WordPress is not connected
        </CardTitle>
        <CardDescription>
          Set the env vars below in Vercel → Project → Settings → Environment
          Variables, then redeploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-sm font-mono text-ivory/80">
          <li>WORDPRESS_URL = https://your-site.com</li>
          <li>WORDPRESS_USERNAME = your-wp-username</li>
          <li>
            WORDPRESS_APP_PASSWORD = app password (generated at Users →
            Profile → Application Passwords)
          </li>
        </ul>
        {missingVars.length > 0 && (
          <div className="text-xs text-amber-300">
            Currently missing: {missingVars.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
