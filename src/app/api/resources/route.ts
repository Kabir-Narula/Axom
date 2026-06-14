import { route, ok } from "@/lib/api";
import { resourceSearchSchema } from "@/lib/validation";
import { searchResources } from "@/lib/services/resource-service";
import { RESOURCE_SOURCES, type ResourceSource } from "@/lib/resources/types";

export const GET = route(
  async ({ req }) => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const sourcesParam = url.searchParams.get("sources");
    const sources = sourcesParam
      ? sourcesParam
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is ResourceSource =>
            (RESOURCE_SOURCES as readonly string[]).includes(s)
          )
      : undefined;

    const input = resourceSearchSchema.parse({
      q,
      sources: sources && sources.length > 0 ? sources : undefined,
    });

    const data = await searchResources(input.q, input.sources);
    return ok(data);
  },
  // External calls are heavier; keep the limit conservative.
  { rateLimit: { limit: 30, windowMs: 60_000, bucket: "resources" } }
);
