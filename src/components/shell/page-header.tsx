import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-6 border-b border-white/[0.05]",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.25em] text-ember-300/80">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl md:text-3xl text-ivory tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
