'use client';

import { useMemo } from 'react';
import { applyWikiLinks } from '@/lib/wiki-link';

interface MarkdownPreviewProps {
  content: string;
  editorLightMode: boolean;
}

function renderMarkdown(source: string): string {
  // Escape HTML entities to prevent injection
  let html = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="md-code-block"><code>${code.trimEnd()}</code></pre>`;
  });

  // Split into blocks by blank lines, but preserve pre blocks
  const blocks: string[] = [];
  const parts = html.split(/(<pre class="md-code-block">[\s\S]*?<\/pre>)/);

  for (const part of parts) {
    if (part.startsWith('<pre class="md-code-block">')) {
      blocks.push(part);
    } else {
      const paragraphs = part.split(/\n{2,}/);
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed) blocks.push(trimmed);
      }
    }
  }

  const rendered = blocks.map((block) => {
    // Skip pre blocks
    if (block.startsWith('<pre class="md-code-block">')) {
      return block;
    }

    // Headings
    if (/^#### /.test(block)) {
      return `<h4 class="md-h4">${applyInline(block.slice(5))}</h4>`;
    }
    if (/^### /.test(block)) {
      return `<h3 class="md-h3">${applyInline(block.slice(4))}</h3>`;
    }
    if (/^## /.test(block)) {
      return `<h2 class="md-h2">${applyInline(block.slice(3))}</h2>`;
    }
    if (/^# /.test(block)) {
      return `<h1 class="md-h1">${applyInline(block.slice(2))}</h1>`;
    }

    const lines = block.split('\n');

    // Block quotes (escaped to &gt; because we HTML-escape before parsing)
    if (lines.every((l) => /^(&gt;|>) /.test(l.trim()) || l.trim() === '')) {
      const quoted = lines
        .filter((l) => l.trim() !== '')
        .map((l) => applyInline(l.trim().replace(/^(&gt;|>)\s?/, '')))
        .join('<br />');
      return `<blockquote class="md-quote">${quoted}</blockquote>`;
    }

    // Bullet lists: consecutive lines starting with "- "
    if (lines.every((l) => /^- /.test(l.trim()) || l.trim() === '')) {
      const items = lines
        .filter((l) => l.trim() !== '')
        .map((l) => `<li>${applyInline(l.trim().slice(2))}</li>`)
        .join('');
      return `<ul class="md-list">${items}</ul>`;
    }

    // Numbered lists: "1. item"
    if (lines.every((l) => /^\d+\. /.test(l.trim()) || l.trim() === '')) {
      const items = lines
        .filter((l) => l.trim() !== '')
        .map((l) => `<li>${applyInline(l.trim().replace(/^\d+\.\s+/, ''))}</li>`)
        .join('');
      return `<ol class="md-list">${items}</ol>`;
    }

    // Default: paragraph
    return `<p class="md-p">${applyInline(block.replace(/\n/g, '<br />'))}</p>`;
  });

  return rendered.join('');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function applyInline(text: string): string {
  // Inline code
  let result = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Wiki-links — aliases use the note name as the target and the label as text
  result = applyWikiLinks(result, escapeAttr);
  return result;
}

export function MarkdownPreview({ content, editorLightMode }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('md-wiki-link')) {
      e.preventDefault();
      const wikiTarget = target.getAttribute('data-wiki-target');
      if (wikiTarget) {
        window.dispatchEvent(
          new CustomEvent('traces:open-note', { detail: { target: wikiTarget } })
        );
      }
    }
  };

  const textColor = editorLightMode ? '#09090b' : '#e4e4e7';
  const mutedColor = editorLightMode ? '#71717a' : '#a1a1aa';
  const codeBg = editorLightMode ? '#f4f4f5' : 'rgba(255,255,255,0.06)';
  const codeBorder = editorLightMode ? '#e4e4e7' : 'rgba(255,255,255,0.1)';
  const linkColor = editorLightMode ? '#2383e2' : '#7cb3f0';

  return (
    <div
      className="h-full overflow-auto"
      onClick={handleClick}
      style={{ padding: '20px 28px' }}
    >
      <style>{`
        .md-preview h1.md-h1 {
          font-size: 1.75em;
          font-weight: 700;
          margin: 0.8em 0 0.4em;
          color: ${textColor};
          line-height: 1.3;
        }
        .md-preview h2.md-h2 {
          font-size: 1.4em;
          font-weight: 600;
          margin: 0.7em 0 0.35em;
          color: ${textColor};
          line-height: 1.3;
        }
        .md-preview h3.md-h3 {
          font-size: 1.15em;
          font-weight: 600;
          margin: 0.6em 0 0.3em;
          color: ${textColor};
          line-height: 1.3;
        }
        .md-preview h4.md-h4 {
          font-size: 1.05em;
          font-weight: 600;
          margin: 0.5em 0 0.25em;
          color: ${textColor};
          line-height: 1.3;
        }
        .md-preview p.md-p {
          margin: 0.5em 0;
          line-height: 1.7;
          color: ${textColor};
        }
        .md-preview ul.md-list,
        .md-preview ol.md-list {
          margin: 0.5em 0;
          padding-left: 1.5em;
          color: ${textColor};
          line-height: 1.7;
        }
        .md-preview ul.md-list {
          list-style-type: disc;
        }
        .md-preview ol.md-list {
          list-style-type: decimal;
        }
        .md-preview .md-quote {
          margin: 0.5em 0;
          padding: 0.4em 0.9em;
          border-left: 3px solid ${linkColor};
          color: ${mutedColor};
        }
        .md-preview ul.md-list li {
          margin: 0.2em 0;
        }
        .md-preview code.md-inline-code {
          background: ${codeBg};
          border: 1px solid ${codeBorder};
          border-radius: 4px;
          padding: 0.15em 0.4em;
          font-size: 0.88em;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        }
        .md-preview pre.md-code-block {
          background: ${codeBg};
          border: 1px solid ${codeBorder};
          border-radius: 8px;
          padding: 12px 16px;
          margin: 0.6em 0;
          overflow-x: auto;
          font-size: 0.88em;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
          line-height: 1.5;
          color: ${textColor};
        }
        .md-preview pre.md-code-block code {
          background: none;
          border: none;
          padding: 0;
          font-size: inherit;
        }
        .md-preview a.md-wiki-link {
          color: ${linkColor};
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 3px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .md-preview a.md-wiki-link:hover {
          opacity: 0.8;
        }
        .md-preview strong {
          font-weight: 700;
        }
        .md-preview em {
          font-style: italic;
          color: ${mutedColor};
        }
      `}</style>
      <div
        className="md-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
