"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Folder, FileText } from "lucide-react";

type PkgFile = { path: string; size: number; text: string | null };

interface TreeNode {
  name: string;
  size?: number;
  children?: Map<string, TreeNode>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Builds a nested tree from flat zip paths ("a/b/c.txt").
function buildTree(
  files: { path: string; size: number }[],
): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let level = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let node = level.get(part);
      if (!node) {
        node = isFile
          ? { name: part, size: f.size }
          : { name: part, children: new Map() };
        level.set(part, node);
      }
      if (node.children) level = node.children;
    });
  }
  return root;
}

// Renders the tree as indented rows (folders first, then files, A→Z).
function fileRows(
  nodes: Map<string, TreeNode>,
  selected: string | null,
  onSelect: (path: string) => void,
  depth = 0,
  prefix = "",
): ReactNode[] {
  const sorted = [...nodes.values()].sort((a, b) => {
    const aDir = !!a.children;
    const bDir = !!b.children;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const out: ReactNode[] = [];
  for (const node of sorted) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    const isFile = !node.children;
    out.push(
      <div
        key={path}
        onClick={isFile ? () => onSelect(path) : undefined}
        className={`flex items-center gap-1.5 rounded py-0.5 text-xs ${
          isFile ? "hover:bg-accent cursor-pointer" : ""
        } ${selected === path ? "bg-accent" : ""}`}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {node.children ? (
          <Folder className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <FileText className="text-muted-foreground/60 size-3.5 shrink-0" />
        )}
        <span className="text-foreground/90 truncate font-[Menlo,monospace]">
          {node.name}
        </span>
        {node.size != null && (
          <span className="text-muted-foreground/60 ml-auto shrink-0 pl-2 tabular-nums">
            {formatBytes(node.size)}
          </span>
        )}
      </div>,
    );
    if (node.children)
      out.push(...fileRows(node.children, selected, onSelect, depth + 1, path));
  }
  return out;
}

// Two-pane file browser: lazily fetches the package contents and renders a tree
// (left) + selected file preview (right). Used on the full-page skill view.
export function PackageFileBrowser({
  skillId,
  hasPackage,
}: {
  skillId: string;
  hasPackage: boolean;
}) {
  const t = useTranslations("detail");
  const [files, setFiles] = useState<PkgFile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPackage) return;
    let cancelled = false;
    setFiles(null);
    setFailed(false);
    setSelected(null);
    fetch(`/api/skills/${skillId}/contents`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ files: PkgFile[] }>)
          : Promise.reject(new Error()),
      )
      .then((d) => {
        if (cancelled) return;
        setFiles(d.files);
        const def =
          d.files.find((f) => f.path === "SKILL.md" && f.text !== null) ??
          d.files.find((f) => f.text !== null);
        setSelected(def?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [skillId, hasPackage]);

  if (!hasPackage) return null;

  const selectedFile = files?.find((f) => f.path === selected) ?? null;
  const boxClass =
    "border-border bg-card rounded-lg border dark:border-white/[0.12]";

  if (failed)
    return (
      <div className={`${boxClass} text-muted-foreground p-3 text-xs`}>
        {t("packageContentsError")}
      </div>
    );
  if (files === null)
    return (
      <div className={`${boxClass} text-muted-foreground p-3 text-xs`}>
        {t("packageContentsLoading")}
      </div>
    );
  if (files.length === 0)
    return (
      <div className={`${boxClass} text-muted-foreground p-3 text-xs`}>—</div>
    );

  return (
    <div className={`${boxClass} flex flex-col overflow-hidden sm:flex-row`}>
      {/* 左:文件树 */}
      <div className="border-border/60 max-h-80 overflow-auto border-b p-2 sm:max-h-[32rem] sm:w-56 sm:shrink-0 sm:border-r sm:border-b-0 dark:border-white/[0.08]">
        {fileRows(buildTree(files), selected, setSelected)}
      </div>
      {/* 右:选中文件内容 */}
      <div className="max-h-80 min-w-0 flex-1 overflow-auto p-3 sm:max-h-[32rem]">
        {!selectedFile ? (
          <p className="text-muted-foreground text-xs">{t("filePreviewHint")}</p>
        ) : (
          <>
            <div className="text-muted-foreground/70 mb-1.5 truncate font-[Menlo,monospace] text-[10px]">
              {selectedFile.path}
            </div>
            {selectedFile.text === null ? (
              <p className="text-muted-foreground text-xs">
                {t("filePreviewUnavailable")}
              </p>
            ) : (
              <pre className="text-foreground/90 font-[Menlo,monospace] text-[11px] leading-relaxed whitespace-pre-wrap">
                {selectedFile.text}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
