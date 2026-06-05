import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders SKILL.md markdown, but with `prose` tuned to fit our compact,
// neutral shadcn design language (tighter spacing, smaller headings, code
// blocks on bg-muted) instead of typography's article defaults.
const MD_CLASS = [
  "prose prose-sm dark:prose-invert max-w-none text-foreground/90",
  // headings: compact, tracked
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
  "prose-h1:text-base prose-h2:text-sm prose-h3:text-[13px] prose-h4:text-xs",
  "prose-headings:mt-5 prose-headings:mb-2 [&>:first-child]:mt-0",
  // body
  "prose-p:my-2 prose-p:leading-relaxed",
  "prose-a:text-foreground prose-a:font-medium prose-a:underline-offset-2",
  "prose-strong:text-foreground",
  // inline code: small chip, no backtick pseudo-content
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-code:bg-muted prose-code:text-foreground/90 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal",
  // fenced code blocks
  "prose-pre:bg-muted/60 prose-pre:text-foreground/90 prose-pre:border prose-pre:border-border prose-pre:rounded-md prose-pre:text-[11px] prose-pre:leading-relaxed dark:prose-pre:border-white/[0.08]",
  // lists / rules / quotes
  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:marker:text-muted-foreground/50",
  "prose-hr:my-5 prose-hr:border-border dark:prose-hr:border-white/[0.08]",
  "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:font-normal",
  // tables (gfm)
  "prose-table:text-xs prose-th:font-semibold prose-th:text-foreground prose-td:border-border",
].join(" ");

export function SkillMarkdown({ children }: { children: string }) {
  return (
    <div className={MD_CLASS}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
