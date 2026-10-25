import { escapeHtml } from './html.js';

function renderInlineMarkdown(text) {
  const pattern =
    /(`+)(.+?)\1|\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let html = '';
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(cursor, index));

    if (match[2] !== undefined) {
      html += `<code>${escapeHtml(match[2])}</code>`;
    } else if (match[3] !== undefined) {
      const href = match[4];
      const protocol = href.slice(0, href.indexOf(':')).toLowerCase();
      if (protocol === 'mailto' || protocol === 'http' || protocol === 'https') {
        html += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[3])}</a>`;
      } else {
        html += escapeHtml(match[0]);
      }
    } else if (match[5] !== undefined || match[6] !== undefined) {
      html += `<strong>${escapeHtml(match[5] ?? match[6])}</strong>`;
    } else if (match[7] !== undefined) {
      html += `<del>${escapeHtml(match[7])}</del>`;
    } else {
      html += `<em>${escapeHtml(match[8] ?? match[9])}</em>`;
    }

    cursor = index + match[0].length;
  }

  return html + escapeHtml(text.slice(cursor));
}

function isBlockStart(line) {
  return (
    /^\s*```/.test(line) ||
    /^ {0,3}#{1,6}\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:[-*+]|\d+[.)])\s+/.test(line)
  );
}

export function renderMarkdown(value) {
  const lines = String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      index += 1;
      const code = [];
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(
        `<blockquote><p>${quote.map(renderInlineMarkdown).join('<br>')}</p></blockquote>`,
      );
      continue;
    }

    const listItem = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (listItem) {
      const ordered = /^\d/.test(listItem[1]);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(`<li>${renderInlineMarkdown(item[2])}</li>`);
        index += 1;
      }
      blocks.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (!paragraph.length) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`);
  }

  return blocks.join('');
}
