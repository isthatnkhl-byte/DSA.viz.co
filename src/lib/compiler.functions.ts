import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CppExecutionResult } from "./compiler.types";
import { runSecureCpp } from "./compiler/index";

const CppExecutionSchema = z.object({
  code: z.string().min(1, "Code cannot be empty"),
  stdin: z.string().optional().default(""),
  compilerVersion: z.string().optional().default("10.2.0"),
});

/**
 * Server function endpoint for C++ execution.
 * Dispatches code execution strictly to isolated sandboxes with resource limits.
 */
export const executeCppCode = createServerFn({ method: "POST" })
  .validator((input: unknown) => CppExecutionSchema.parse(input))
  .handler(async ({ data }): Promise<CppExecutionResult> => {
    return await runSecureCpp(data.code, data.stdin);
  });
