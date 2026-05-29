"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { relativeTime } from "@/lib/utils";
import {
  createWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  runWorkflowNow,
} from "@/server/actions/workflows";

export type WorkflowRow = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  steps: { type: string; config?: Record<string, unknown> }[];
  isActive: boolean;
  createdAt: string;
  recentExecutions: {
    id: string;
    status: string;
    finishedAt: string | null;
    errorMessage: string | null;
  }[];
};

export type StepType = { type: string; description: string };

export function WorkflowsClient({
  workflows,
  stepTypes,
  canDelete,
}: {
  workflows: WorkflowRow[];
  stepTypes: StepType[];
  canDelete: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {workflows.length === 0
            ? "No workflows yet. Build your first one below."
            : `${workflows.length} workflow${workflows.length === 1 ? "" : "s"} · ${workflows.filter((w) => w.isActive).length} active`}
        </p>
        <Button variant="gold" size="sm" onClick={() => setShowCreate((s) => !s)}>
          <Plus className="h-4 w-4" /> {showCreate ? "Hide form" : "New Workflow"}
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <CreateForm
              stepTypes={stepTypes}
              onDone={() => setShowCreate(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {workflows.map((w) => (
          <WorkflowCard key={w.id} workflow={w} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}

function CreateForm({
  stepTypes,
  onDone,
}: {
  stepTypes: StepType[];
  onDone: () => void;
}) {
  const [name, setName] = useState("Blog → Brotherhood draft");
  const [description, setDescription] = useState(
    "When a WordPress article publishes, draft a Telegram brotherhood teaser pointing to it.",
  );
  const [trigger, setTrigger] = useState("CONTENT_PUBLISHED");
  const [selectedStepType, setSelectedStepType] = useState(
    stepTypes[0]?.type ?? "telegram.draft_about_payload",
  );
  const [steps, setSteps] = useState<{ type: string }[]>([
    { type: "telegram.draft_about_payload" },
  ]);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (steps.length === 0) {
      toast.error("Add at least one step.");
      return;
    }
    startTransition(async () => {
      const r = await createWorkflow({
        name,
        description: description || undefined,
        trigger,
        steps,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Workflow created.");
      onDone();
    });
  }

  function addStep() {
    setSteps((s) => [...s, { type: selectedStepType }]);
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Workflow</CardTitle>
        <CardDescription>
          Pick a trigger, chain up steps. The workflow fires automatically when
          the trigger event happens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTENT_PUBLISHED">
                    Content published (e.g. WordPress)
                  </SelectItem>
                  <SelectItem value="MANUAL">Manual only</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled (cron)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Steps</Label>
            <div className="rounded-md border border-white/[0.05] bg-ink-900/40 p-3 space-y-2">
              {steps.length === 0 && (
                <div className="text-xs text-muted-foreground italic">
                  No steps yet. Add one below.
                </div>
              )}
              {steps.map((s, i) => {
                const meta = stepTypes.find((st) => st.type === s.type);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-ink-900/60 rounded px-2 py-1.5"
                  >
                    <div className="h-5 w-5 rounded-full bg-ember-500/15 flex items-center justify-center text-[10px] font-mono text-ember-200">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-ivory font-mono text-xs">
                        {s.type}
                      </div>
                      {meta && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {meta.description}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-muted-foreground hover:text-red-300"
                      aria-label="Remove step"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Select
                  value={selectedStepType}
                  onValueChange={setSelectedStepType}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stepTypes.map((st) => (
                      <SelectItem key={st.type} value={st.type}>
                        <div className="flex flex-col text-left">
                          <span className="font-mono text-xs">{st.type}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {st.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                >
                  <Plus className="h-3 w-3" /> Add step
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onDone}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create workflow
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function WorkflowCard({
  workflow,
  canDelete,
}: {
  workflow: WorkflowRow;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(workflow.isActive);

  function toggle(v: boolean) {
    setActive(v); // optimistic
    startTransition(async () => {
      const r = await toggleWorkflow(workflow.id, v);
      if (!r.ok) {
        setActive(!v);
        toast.error(r.error);
      } else {
        toast.success(v ? "Activated." : "Paused.");
      }
    });
  }

  function runNow() {
    startTransition(async () => {
      const r = await runWorkflowNow(workflow.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Workflow ran. Check the execution log.");
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${workflow.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const r = await deleteWorkflow(workflow.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Deleted.");
    });
  }

  return (
    <Card className="group hover:border-ember-500/30 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-4 w-4 text-ember-300" />
            {workflow.name}
          </CardTitle>
          <CardDescription className="space-x-2">
            <Badge variant="outline" className="text-[10px]">
              {workflow.trigger.replace("_", " ").toLowerCase()}
            </Badge>
            <span>{workflow.description ?? "—"}</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={toggle} disabled={pending} />
          <Button
            variant="outline"
            size="sm"
            onClick={runNow}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Run now
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={pending}
              className="text-muted-foreground hover:text-red-300"
              aria-label="Delete workflow"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {workflow.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="rounded-md border border-white/[0.06] bg-ink-900/60 px-3 py-1.5 text-ivory">
                <span className="text-ember-300 font-mono mr-1.5">{i + 1}.</span>
                <span className="font-mono">{step.type}</span>
              </div>
              {i < workflow.steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              )}
            </li>
          ))}
        </ol>

        {workflow.recentExecutions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Last runs
            </div>
            <div className="space-y-1">
              {workflow.recentExecutions.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 text-[11px]"
                >
                  {e.status === "SUCCEEDED" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  ) : e.status === "FAILED" ? (
                    <XCircle className="h-3 w-3 text-red-400" />
                  ) : (
                    <Loader2 className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">
                    {e.finishedAt
                      ? relativeTime(e.finishedAt)
                      : "running…"}
                  </span>
                  {e.errorMessage && (
                    <span className="text-red-300 truncate flex-1">
                      {e.errorMessage}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
