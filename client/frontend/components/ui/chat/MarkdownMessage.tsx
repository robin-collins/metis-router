"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
  showCursor?: boolean;
}

const CodeBlock = ({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match) {
    return (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3 text-gray-300" />
        )}
      </button>
      <SyntaxHighlighter
        style={oneDark as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        language={language}
        PreTag="div"
        className="rounded-lg !bg-gray-900 !p-4"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '', showCursor = false }) => {
  // If content is empty and we're showing cursor, just show the cursor
  if (content.trim() === '' && showCursor) {
    return (
      <div className={`prose prose-sm max-w-none ${className}`}>
        <p className="mb-4 leading-relaxed text-gray-800">
          <span className="inline-block w-0.5 h-4 bg-gray-800 animate-blink align-baseline" />
        </p>
      </div>
    );
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code: CodeBlock,
          // Headings
          h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h1 className="text-xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h2 className="text-lg font-semibold mt-5 mb-3 text-gray-900" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h3 className="text-base font-medium mt-4 mb-2 text-gray-900" {...props}>
              {children}
            </h3>
          ),
          // Links
          a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a 
              href={href} 
              className="text-indigo-600 hover:text-indigo-800 underline" 
              target="_blank" 
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Lists
          ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
            <ul className="list-disc list-inside space-y-1 mb-4" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
            <ol className="list-decimal list-inside space-y-1 mb-4" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
            <li className="text-gray-800 leading-relaxed" {...props}>
              {children}
            </li>
          ),
          // Paragraphs
          p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
            <p className="mb-4 leading-relaxed text-gray-800" {...props}>
              {children}
            </p>
          ),
          // Blockquotes
          blockquote: ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
            <blockquote className="border-l-4 border-indigo-200 pl-4 py-2 bg-indigo-50 rounded-r mb-4 italic" {...props}>
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-200 rounded" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
            <thead className="bg-gray-50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
            <th className="px-4 py-2 text-left font-medium text-gray-900 border-b border-gray-200" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
            <td className="px-4 py-2 text-gray-800 border-b border-gray-100" {...props}>
              {children}
            </td>
          ),
          // Horizontal rule
          hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
            <hr className="my-6 border-gray-200" {...props} />
          ),
          // Strong/Bold
          strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
            <strong className="font-semibold text-gray-900" {...props}>
              {children}
            </strong>
          ),
          // Emphasis/Italic
          em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
            <em className="italic text-gray-800" {...props}>
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {showCursor && content.trim() !== '' && (
        <span className="inline-block w-0.5 h-4 bg-gray-800 animate-blink ml-0.5 align-baseline" />
      )}
    </div>
  );
};

export default MarkdownMessage; 