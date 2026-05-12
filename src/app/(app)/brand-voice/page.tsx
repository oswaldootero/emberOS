import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShieldAlert, Sparkles } from "lucide-react";
import { HEAVENS_LEAF_VOICE } from "@/server/ai/brand-voice";

export const metadata = { title: "Brand Voice" };

export default function BrandVoicePage() {
  const v = HEAVENS_LEAF_VOICE;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Brand Voice Memory"
        title="The soul behind every word."
        description="Persistent tone, vocabulary, and theological boundaries. Loaded into every AI generation."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-ember-300" /> Identity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display italic text-lg text-ivory leading-relaxed">
            {v.identity}
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ember-300" /> Tone Descriptors
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {v.tone.map((t) => (
              <Badge key={t} variant="gold">
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {v.themes.map((t) => (
                <li
                  key={t}
                  className="text-sm text-ivory/90 border-l-2 border-ember-500/40 pl-3"
                >
                  {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Language Palette</CardTitle>
          <CardDescription>Words and rhythms that feel like home.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {v.preferredLanguage.map((p) => (
            <Badge key={p} variant="outline" className="font-display italic">
              {p}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" /> Hard Rules
          </CardTitle>
          <CardDescription>
            Non-negotiable guardrails enforced on every generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {v.hardRules.map((r) => (
              <li
                key={r}
                className="text-sm text-ivory/90 flex gap-2 items-start"
              >
                <span className="text-amber-400 mt-1">·</span>
                {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forbidden Words & Phrases</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {v.forbiddenWords.map((w) => (
            <Badge key={w} variant="destructive">
              {w}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cadence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ivory/90 leading-relaxed italic">{v.cadence}</p>
        </CardContent>
      </Card>
    </div>
  );
}
