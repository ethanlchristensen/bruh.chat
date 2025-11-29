import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";
import "katex/dist/katex.min.css";
import { useTheme } from "../theme/theme-provider";
import { useClipboard } from "@/hooks/use-clipboard";

interface MarkdownProps {
  content: string;
}

const CodeBlockWithCopy = ({
  language,
  code,
}: {
  language: string;
  code: string;
}) => {
  const { copy, copied } = useClipboard();

  const handleCopy = async () => {
    copy(code);
  };

  const { effectiveTheme } = useTheme();

  const codeTheme = useMemo(() => {
    return effectiveTheme === "dark" ? oneDark : oneLight;
  }, [effectiveTheme]);

  return (
    <div className="relative group first:mt-0 last:mb-0">
      <div className="flex items-center justify-between bg-card py-1 px-2 rounded-t-lg">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={codeTheme}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          fontSize: "0.75rem",
          background: "var(--card)",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownProps> = ({ content }) => {
  const components: Components = {
    code({ node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;
      const language = match ? match[1] : "";
      const code = String(children).replace(/\n$/, "");

      if (isInline) {
        return (
          <code
            className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return <CodeBlockWithCopy language={language} code={code} />;
    },

    a({ node, children, href, ...props }) {
      const isExternal = href?.startsWith("http");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary hover:underline"
          {...props}
        >
          {children}
        </a>
      );
    },

    img({ node, src, alt, ...props }) {
      return (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="rounded-lg max-w-full h-auto my-3 first:mt-0 last:mb-0"
          {...props}
        />
      );
    },

    blockquote({ node, children, ...props }) {
      return (
        <blockquote
          className="border-l-4 border-primary/50 pl-4 my-2 first:mt-0 last:mb-0 italic text-muted-foreground"
          {...props}
        >
          {children}
        </blockquote>
      );
    },

    table({ node, children, ...props }) {
      return (
        <div className="overflow-x-auto my-3 first:mt-0 last:mb-0">
          <table className="w-full border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },

    thead({ node, children, ...props }) {
      return (
        <thead className="text-xs bg-muted" {...props}>
          {children}
        </thead>
      );
    },

    th({ node, children, ...props }) {
      return (
        <th
          className="text-xs border border-border px-4 py-2 text-left font-semibold"
          {...props}
        >
          {children}
        </th>
      );
    },

    td({ node, children, ...props }) {
      return (
        <td className="text-xs border border-border px-4 py-2" {...props}>
          {children}
        </td>
      );
    },

    ul({ node, children, ...props }) {
      return (
        <ul
          className="text-xs list-disc list-inside my-2 first:mt-0 last:mb-0 space-y-1"
          {...props}
        >
          {children}
        </ul>
      );
    },

    ol({ node, children, ...props }) {
      return (
        <ol
          className="text-xs list-decimal list-inside my-2 first:mt-0 last:mb-0 space-y-1"
          {...props}
        >
          {children}
        </ol>
      );
    },

    h1({ node, children, ...props }) {
      return (
        <h1
          className="text-3xl font-bold mt-6 mb-3 first:mt-0 scroll-m-20"
          {...props}
        >
          {children}
        </h1>
      );
    },

    h2({ node, children, ...props }) {
      return (
        <h2
          className="text-2xl font-semibold mt-5 mb-2 first:mt-0 pb-2 border-b scroll-m-20"
          {...props}
        >
          {children}
        </h2>
      );
    },

    h3({ node, children, ...props }) {
      return (
        <h3
          className="text-xl font-semibold mt-4 mb-2 first:mt-0 scroll-m-20"
          {...props}
        >
          {children}
        </h3>
      );
    },

    h4({ node, children, ...props }) {
      return (
        <h4
          className="text-lg font-semibold mt-3 mb-1.5 first:mt-0 scroll-m-20"
          {...props}
        >
          {children}
        </h4>
      );
    },

    p({ node, children, ...props }) {
      return (
        <p className="text-xs leading-7 my-2 first:mt-0 last:mb-0" {...props}>
          {children}
        </p>
      );
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
};
