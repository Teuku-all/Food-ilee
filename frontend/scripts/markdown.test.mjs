import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../utils/markdown.js';

test('renders common inline and block Markdown', () => {
  assert.equal(
    renderMarkdown(
      '# Panduan\n\n**Penting** dan *segar* dengan ~~harga lama~~, `organik`.\n\n- Sayur\n- Buah\n\n1. Pilih\n2. Olah',
    ),
    '<h1>Panduan</h1><p><strong>Penting</strong> dan <em>segar</em> dengan <del>harga lama</del>, <code>organik</code>.</p><ul><li>Sayur</li><li>Buah</li></ul><ol><li>Pilih</li><li>Olah</li></ol>',
  );
});

test('renders safe links and escapes raw HTML and unsafe link protocols', () => {
  const html = renderMarkdown(
    '<img src=x onerror=alert(1)> [Food Ilee](https://foodilee.id) [unsafe](javascript:alert(1))',
  );

  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(
    html,
    /<a href="https:\/\/foodilee\.id" target="_blank" rel="noopener noreferrer">Food Ilee<\/a>/,
  );
  assert.doesNotMatch(html, /<img|href="javascript:/);
});
