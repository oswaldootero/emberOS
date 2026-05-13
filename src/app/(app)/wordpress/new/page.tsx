import { PageHeader } from "@/components/shell/page-header";
import { WPComposer } from "@/components/wordpress/composer";
import { isConfigured } from "@/server/integrations/wordpress";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "New WordPress Article" };

export default function NewWPArticlePage() {
  if (!isConfigured()) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="WordPress"
          title="Compose"
          description="Connect WordPress first to publish from here."
        />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD
            in Vercel, then redeploy.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="WordPress"
        title="Compose"
        description="Title, body, slug, schedule, SEO meta — then ship it."
      />
      <WPComposer />
    </div>
  );
}
