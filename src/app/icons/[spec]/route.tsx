import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

/**
 * Brand icons rendered on demand — referenced by the web app manifest
 * and iOS metadata. Stable URLs: /icons/192, /icons/512,
 * /icons/maskable-192, /icons/maskable-512, /icons/apple.
 */
const SPECS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-192": { size: 192, maskable: true },
  "maskable-512": { size: 512, maskable: true },
  apple: { size: 180, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(SPECS).map((spec) => ({ spec }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spec: string }> },
) {
  const { spec } = await params;
  const cfg = SPECS[spec];
  if (!cfg) notFound();

  // Maskable icons must keep the mark inside the central "safe zone"
  // (~80% circle) so Android can crop freely.
  const flameSize = Math.round(cfg.size * (cfg.maskable ? 0.52 : 0.62));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 42%, #1a1426 0%, #0a0a0f 62%)",
        }}
      >
        <svg
          width={flameSize}
          height={flameSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e0a848"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </div>
    ),
    {
      width: cfg.size,
      height: cfg.size,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}
