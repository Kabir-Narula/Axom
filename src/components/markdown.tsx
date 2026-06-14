import * as React from "react";

/**
 * Minimal, safe Markdown renderer for Axom-generated notes.
 *
 * Supports: #/##/### headings, nested "- " bullet lists (2-space indent),
 * **bold**, `inline code`, and paragraphs. Input is escaped first, so no raw
 * HTML from the source is ever injected (XSS-safe by construction).
 */
export function Markdown({ source }: { source: string }) {
  return <div className="note-body">{render(source)}</div>;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const escaped = escapeHtml(text);
  const nodes: React.ReactNode[] = [];
  // Split on **bold** and `code` while keeping delimiters.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(escaped)) !== null) {
    if (match.index > last) nodes.push(escaped.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(<code key={`${keyPrefix}-c-${i}`}>{token.slice(1, -1)}</code>);
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < escaped.length) nodes.push(escaped.slice(last));
  return nodes;
}

function render(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let listItems: { depth: number; text: string }[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {listItems.map((li, idx) => (
          <li key={idx} style={{ marginLeft: li.depth * 16 }}>
            {inline(li.text, `li-${key}-${idx}`)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushList();
      continue;
    }
    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      const depth = Math.floor(bullet[1].length / 2);
      listItems.push({ depth, text: bullet[2] });
      continue;
    }
    flushList();
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = inline(h[2], `h-${key}`);
      if (level === 1) out.push(<h2 key={`h-${key++}`}>{content}</h2>);
      else if (level === 2) out.push(<h2 key={`h-${key++}`}>{content}</h2>);
      else out.push(<h3 key={`h-${key++}`}>{content}</h3>);
      continue;
    }
    out.push(<p key={`p-${key++}`}>{inline(line, `p-${key}`)}</p>);
  }
  flushList();
  return out;
}
