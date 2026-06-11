import { PageHeader } from "@/components/shell/page-header";
import {
  ForecastingClient,
  type ScenarioRow,
} from "@/components/forecasting/forecasting-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { inputsFromScenario } from "@/server/forecasting/calculator";

export const metadata = { title: "Revenue Forecasting" };
export const dynamic = "force-dynamic";

export default async function ForecastingPage() {
  await requireUser();

  const scenarios = await prisma.forecastScenario.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const rows: ScenarioRow[] = scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    isDefault: s.isDefault,
    inputs: inputsFromScenario(s),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue Forecasting"
        title="What the year could look like."
        description="Project wholesale, events, website, and subscription revenue across scenarios. Edit any variable — the math updates live."
      />
      <ForecastingClient scenarios={rows} />
    </div>
  );
}
