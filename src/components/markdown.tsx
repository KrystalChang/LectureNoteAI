"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/**
 * Single place that renders AI markdown across the app (summaries, Q&A answers,
 * notes export). Centralising the plugin list means math support — and any
 * future markdown feature — is added in one spot.
 *
 *  - remarkGfm   : tables, strikethrough, task lists, autolinks
 *  - remarkMath  : parses $inline$ and $$block$$ TeX
 *  - rehypeKatex : renders that TeX to HTML using KaTeX
 */

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

type MarkdownProps = {
  children: string;
  /** Extra classes appended to the `.markdown` wrapper (e.g. a streaming caret). */
  className?: string;
};

export default function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div className={`markdown ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
