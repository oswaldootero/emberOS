import { describe, expect, it } from "vitest";
import { daysUntilDue, dueLabel, groupReminders, parseDueDate, reminderCopy, taskToAction, taskUrgency } from "./logic";

const NOW = new Date("2026-09-05T15:30:00Z");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe("parseDueDate", () => {
  it("accepts yyyy-mm-dd as UTC midnight and rejects the rest", () => {
    expect(parseDueDate("2026-09-05")?.toISOString()).toBe("2026-09-05T00:00:00.000Z");
    expect(parseDueDate("09/05/2026")).toBeNull();
    expect(parseDueDate("")).toBeNull();
    expect(parseDueDate(undefined)).toBeNull();
  });
});

describe("due labels and urgency", () => {
  it("counts whole UTC days regardless of time of day", () => {
    expect(daysUntilDue(day("2026-09-05"), NOW)).toBe(0);
    expect(daysUntilDue(day("2026-09-03"), NOW)).toBe(-2);
    expect(daysUntilDue(day("2026-09-08"), NOW)).toBe(3);
  });
  it("labels relative days", () => {
    expect(dueLabel(day("2026-09-05"), NOW)).toBe("Today");
    expect(dueLabel(day("2026-09-06"), NOW)).toBe("Tomorrow");
    expect(dueLabel(day("2026-09-04"), NOW)).toBe("Yesterday");
    expect(dueLabel(day("2026-09-01"), NOW)).toBe("4 days overdue");
    expect(dueLabel(day("2026-09-09"), NOW)).toBe("Wednesday");
    expect(dueLabel(day("2026-10-01"), NOW)).toBe("Oct 1");
    expect(dueLabel(null, NOW)).toBe("No date");
  });
  it("maps to board urgency", () => {
    expect(taskUrgency(day("2026-09-04"), NOW)).toBe("overdue");
    expect(taskUrgency(day("2026-09-05"), NOW)).toBe("today");
    expect(taskUrgency(day("2026-09-07"), NOW)).toBe("soon");
    expect(taskUrgency(day("2026-09-20"), NOW)).toBe("info");
    expect(taskUrgency(null, NOW)).toBe("info");
  });
});

describe("taskToAction", () => {
  it("builds a board row with linked record and priority", () => {
    const a = taskToAction(
      { id: "t1", title: "Call about invoice", dueAt: day("2026-09-05"), priority: "HIGH", linkedLabel: "The District Cigars", href: "/tasks" },
      NOW,
    );
    expect(a).toMatchObject({ id: "task-t1", kind: "task", urgency: "today", detail: "The District Cigars · High priority · Today" });
  });
  it("lifts undated high-priority tasks to 'soon'", () => {
    expect(taskToAction({ id: "t", title: "x", dueAt: null, priority: "HIGH", linkedLabel: null, href: "/" }, NOW).urgency).toBe("soon");
    expect(taskToAction({ id: "t", title: "x", dueAt: null, priority: "NORMAL", linkedLabel: null, href: "/" }, NOW).urgency).toBe("info");
  });
});

describe("reminders", () => {
  it("groups due and overdue per assignee and skips future or unassigned", () => {
    const g = groupReminders(
      [
        { assigneeId: "u1", dueAt: day("2026-09-05") },
        { assigneeId: "u1", dueAt: day("2026-09-01") },
        { assigneeId: "u2", dueAt: day("2026-09-05") },
        { assigneeId: "u2", dueAt: day("2026-09-30") },
        { assigneeId: null, dueAt: day("2026-09-05") },
      ],
      NOW,
    );
    expect(g.get("u1")).toMatchObject({ today: [{ assigneeId: "u1" }], overdue: [{ assigneeId: "u1" }] });
    expect(g.get("u2")?.today).toHaveLength(1);
    expect(g.get("u2")?.overdue).toHaveLength(0);
    expect(g.size).toBe(2);
  });
  it("writes the reminder copy", () => {
    expect(reminderCopy({ today: [1], overdue: [] })).toEqual({ title: "1 task needs you", body: "1 due today" });
    expect(reminderCopy({ today: [1, 2], overdue: [3] })).toEqual({ title: "3 tasks need you", body: "2 due today · 1 overdue" });
  });
});
