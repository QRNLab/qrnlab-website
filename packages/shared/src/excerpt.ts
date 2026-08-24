import { marked } from 'marked';

const MAX_CHARS = 280;

function inlineText(tokens: any[]): string {
  let out = '';
  for (const t of tokens ?? []) {
    if (t.type === 'image') continue;
    if (t.tokens?.length) {
      out += inlineText(t.tokens);
    } else if (typeof t.text === 'string') {
      out += t.text;
    }
  }
  return out;
}

/**
 * Derive the first ~2 lines of a Markdown body as plain text. Used for blog
 * listing cards so the start of the post is visible before clicking through.
 * A manually provided excerpt always wins over the derived one.
 */
export function autoExcerpt(body?: string | null, manual?: string | null): string | undefined {
  const manualTrimmed = manual?.trim();
  if (manualTrimmed) return manualTrimmed;
  if (!body) return undefined;

  let plain = '';
  try {
    const tokens = marked.lexer(body);
    const parts: string[] = [];
    for (const tok of tokens) {
      if (tok.type !== 'paragraph' || !tok.tokens?.length) continue;
      const text = inlineText(tok.tokens).replace(/\s+/g, ' ').trim();
      if (!text) continue;
      parts.push(text);
      if (parts.join(' ').length >= MAX_CHARS) break;
    }
    plain = parts.join(' ').slice(0, MAX_CHARS).trim();
  } catch {
    plain = body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
      .replace(/[#>*_~]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, MAX_CHARS)
      .trim();
  }

  if (!plain) return undefined;
  if (/[.!?…]$/.test(plain)) return plain;
  return `${plain}…`;
}
