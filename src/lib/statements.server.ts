import statements from "../data/statements.json";
import {
  registerStatementsMap,
  statementForSlug,
  generateSynthesizedStatement,
} from "./statements";

const serverStatementsMap = ((statements as any)?.default || statements || {}) as Record<
  string,
  string
>;
registerStatementsMap(serverStatementsMap);

export { statementForSlug, generateSynthesizedStatement };

