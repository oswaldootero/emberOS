import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Server-component table primitives for sortable, paginated lists.
 * Sorting + pagination are URL-driven (searchParams) so the server
 * does the work — scales to large tables with zero client state.
 */

export function buildQuery(
  base: Record<string, string | number | undefined>,
  overrides: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  basePath,
  baseQuery,
  className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  basePath: string;
  baseQuery: Record<string, string | number | undefined>;
  className?: string;
}) {
  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";
  return (
    <Link
      href={`${basePath}${buildQuery(baseQuery, { sort: field, dir: nextDir, page: 1 })}`}
      className={cn(
        "inline-flex items-center gap-1 hover:text-ivory transition",
        isActive && "text-ivory",
        className,
      )}
    >
      {label}
      {isActive &&
        (currentDir === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3" />
        ))}
    </Link>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  baseQuery,
  noun = "rows",
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  baseQuery: Record<string, string | number | undefined>;
  noun?: string;
}) {
  if (pageCount <= 1) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {total} {noun}
      </p>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] text-muted-foreground">
        Page {page} of {pageCount} · {total} {noun}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={`${basePath}${buildQuery(baseQuery, { page: page - 1 })}`}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          asChild={page < pageCount}
        >
          {page < pageCount ? (
            <Link href={`${basePath}${buildQuery(baseQuery, { page: page + 1 })}`}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
