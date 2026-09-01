import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface ProblemStatementTabProps {
  statement: string;
}

export const ProblemStatementTab = memo(function ProblemStatementTab({
  statement,
}: ProblemStatementTabProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-background/80 [&_pre]:p-3.5 [&_strong]:text-foreground">
      {statement ? (
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{statement}</ReactMarkdown>
      ) : (
        <div className="py-8 text-center text-muted-foreground">Loading problem statement...</div>
      )}
    </div>
  );
});

