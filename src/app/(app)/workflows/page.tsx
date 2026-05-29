import { PageHeader } from "@/components/shell/page-header";
import {
  WorkflowsClient,
  type WorkflowRow,
} from "@/components/workflows/workflows-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { listKnownStepTypes } from "@/server/workflows/engine";

export const metadata = { title: "Workflows" };
export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const user = await requireUser();

  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      executions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          finishedAt: true,
          errorMessage: true,
        },
      },
    },
  });

  const rows: WorkflowRow[] = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    trigger: w.trigger,
    steps: (w.steps as Array<{ type: string; config?: Record<string, unknown> }>) ?? [],
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
    recentExecutions: w.executions.map((e) => ({
      id: e.id,
      status: e.status,
      finishedAt: e.finishedAt?.toISOString() ?? null,
      errorMessage: e.errorMessage,
    })),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workflows"
        title="Automation that respects the craft."
        description="When a thing happens, do this list of things. One source, many channels — without you doing it twice."
      />
      <WorkflowsClient
        workflows={rows}
        stepTypes={listKnownStepTypes()}
        canDelete={user.role === "ADMIN"}
      />
    </div>
  );
}
