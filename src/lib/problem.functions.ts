import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import statementsData from "../data/statements.json";
import { statementForSlug } from "./statements";

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

      // 1. Fast check in local statements bundle first
      const direct =
        statementsMap[s] ||
        statementsMap[s.replace(/_/g, "-").replace(/\s+/g, "-")] ||
        "";
      if (direct) {
        return { statement: direct };
      }

      // 2. Return synthesized canonical statement
      const fallback = statementForSlug(slug);
      return { statement: fallback };
    } catch (e) {
      console.error("getStatement handler error:", e);
      return { statement: statementForSlug(data?.slug || "") };
    }
  });
