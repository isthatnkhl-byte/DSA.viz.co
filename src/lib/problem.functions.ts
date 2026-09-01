import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import statementsData from "../data/statements.json";

const statementsMap = ((statementsData as any)?.default || statementsData || {}) as Record<string, string>;

export const getStatement = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (
      typeof input === "object" &&
      input !== null &&
      "slug" in input &&
      typeof (input as { slug?: unknown }).slug === "string"
    ) {
      return { slug: (input as { slug: string }).slug };
    }
    return z.object({ slug: z.string() }).parse(input);
  })
  .handler(async ({ data }): Promise<{ statement: string }> => {
    try {
      const slug = data?.slug ?? "";
      if (!slug) return { statement: "" };

      let s = "";
      try {
        s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
      } catch {
        s = slug.toLowerCase().trim().replace(/\/+$/, "");
      }

      // Fast check in local statements bundle first
      const direct = statementsMap[s] || statementsMap[s.replace(/_/g, "-").replace(/\s+/g, "-")] || "";
      if (direct) {
        return { statement: direct };
      }

      // Query the backend server endpoint to avoid client CORS restrictions
      try {
        const res = await fetch(`/api/statement?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const json = await res.json();
          return { statement: json.statement || "" };
        }
      } catch (err) {
        console.warn("Could not fetch statement from server API:", err);
      }

      return { statement: "" };
    } catch (e) {
      console.error("getStatement handler error:", e);
      return { statement: "" };
    }
  });