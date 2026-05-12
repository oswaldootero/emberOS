import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-5">
        <Flame className="h-7 w-7 text-ember-300 mx-auto" />
        <h1 className="font-display text-4xl text-gold">404</h1>
        <p className="text-sm text-muted-foreground">
          The path you took burns off into smoke. There is no page here.
        </p>
        <Button variant="gold" asChild>
          <Link href="/dashboard">Return to Mission Control</Link>
        </Button>
      </div>
    </div>
  );
}
