import { z } from "zod";
import { openai } from "@/lib/openai";

export const ImageRequestSchema = z.object({
  prompt: z.string().min(3).max(2000),
  size: z
    .enum(["1024x1024", "1536x1024", "1024x1536"])
    .default("1536x1024"),
  quality: z.enum(["low", "medium", "high", "auto"]).default("high"),
  /**
   * Whether to augment the prompt with the Heaven's Leaf aesthetic.
   * Default true — produces images that match the brand.
   */
  applyBrandStyle: z.boolean().default(true),
});

export type ImageRequest = z.infer<typeof ImageRequestSchema>;

/**
 * The Heaven's Leaf visual language layered onto every prompt unless the
 * caller opts out. We never override the user's subject — we set tone.
 */
const VISUAL_STYLE = [
  "Cinematic still, soft warm key light, deep shadows.",
  "Heaven's Leaf aesthetic: dark tobacco brown, matte black, ivory, muted gold accents.",
  "Film grain. Shallow depth of field. 35mm or 50mm prime feel.",
  "Composition reflective and unhurried, never busy.",
  "Avoid: cartoon, illustrated, neon, over-saturated, stock-photo look, watermarks, text.",
].join(" ");

function augment(prompt: string): string {
  return `${prompt.trim()}\n\nStyle directive: ${VISUAL_STYLE}`;
}

export type GeneratedImage = {
  dataUrl: string; // data:image/png;base64,...
  promptUsed: string;
  model: string;
  size: string;
};

export async function generateImage(
  req: ImageRequest,
): Promise<GeneratedImage> {
  const client = openai();
  const promptUsed = req.applyBrandStyle ? augment(req.prompt) : req.prompt;

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt: promptUsed,
    size: req.size,
    quality: req.quality,
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  return {
    dataUrl: `data:image/png;base64,${b64}`,
    promptUsed,
    model: "gpt-image-1",
    size: req.size,
  };
}
