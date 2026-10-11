import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import DOMPurify from "dompurify";
import { RefreshCw } from "lucide-react";

interface ProblemStatementTabProps {
  statement: string;
  isLoading?: boolean;
  onRetry?: () => void;
}

export const ProblemStatementTab = memo(function ProblemStatementTab({
  statement,
  isLoading = false,
  onRetry,
}: ProblemStatementTabProps) {
  const sanitizedStatement = useMemo(() => {
    if (!statement) return "";
    return DOMPurify.sanitize(statement, {
      ALLOWED_TAGS: [
        "p", "b", "i", "em", "strong", "a", "ul", "ol", "li", "code", "pre",
        "sub", "sup", "img", "table", "thead", "tbody", "tr", "th", "td",
        "blockquote", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
        "br", "hr", "font", "del", "ins"
      ],
      ALLOWED_ATTR: [
        "href", "src", "alt", "title", "class", "target", "rel", "width", "height", "style"
      ],
      ALLOW_DATA_ATTR: false,
    });
  }, [statement]);

  if (isLoading && !statement) {
    return (
      <div className="space-y-3 py-2 animate-pulse">
        <div className="h-5 w-2/5 rounded-md bg-muted/60" />
        <div className="h-3.5 w-4/5 rounded-md bg-muted/40" />
        <div className="h-3.5 w-3/4 rounded-md bg-muted/40" />
        <div className="h-20 w-full rounded-xl bg-muted/30 border border-border/40 p-3" />
        <div className="h-3.5 w-1/2 rounded-md bg-muted/40" />
        <div className="h-3.5 w-2/3 rounded-md bg-muted/40" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted-foreground">
        <p className="text-xs">Problem description is currently unavailable.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="size-3" /> Retry Statement
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 break-words overflow-hidden text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_code]:break-words [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-background/80 [&_pre]:p-3.5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:whitespace-pre-wrap [&_pre_code]:break-words [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{sanitizedStatement}</ReactMarkdown>
    </div>
  );
});


