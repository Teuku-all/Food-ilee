import { loadStylesheet } from '../../utils/stylesheet.js';
import { translate, getLanguage } from '../../utils/i18n.js';
import { askAI } from '../../services/ai.js';
import { escapeHtml } from '../../utils/html.js';
import { renderMarkdown } from '../../utils/markdown.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';

const prompts = [
  'Apakah sisa sayuran cocok untuk kompos?',
  'Bagaimana cara menyimpan limbah organik?',
  'Bagaimana menentukan harga yang menarik?',
  'Limbah apa yang cocok untuk pakan ternak?',
];
const historyKey = () => `foodilee_ai_conversation_v1:${getLanguage()}`;
const pendingConversations = new Map();

window.addEventListener('foodilee:language-changed', () => {
  if (location.hash !== '#tanya-ai') return;
  const input = document.getElementById('ai-input');
  const draft = input?.value || '';
  const selection = input ? [input.selectionStart, input.selectionEnd] : null;
  const focused = document.activeElement;
  const menuOpen = document.querySelector('.fi-account-menu')?.classList.contains('open');
  renderAI();
  const nextInput = document.getElementById('ai-input');
  if (nextInput) {
    nextInput.value = draft;
    if (selection) nextInput.setSelectionRange(...selection);
  }
  if (menuOpen) {
    document.querySelector('.fi-account-menu')?.classList.add('open');
    document.querySelector('.fi-account-menu')?.setAttribute('aria-hidden', 'false');
    document.querySelector('.fi-account-toggle')?.setAttribute('aria-expanded', 'true');
  }
  const choice = focused?.dataset.languageChoice;
  const nextFocus = choice
    ? document.querySelector(`[data-language-choice="${choice === 'en' ? 'en' : 'id'}"]`)
    : focused?.id
      ? document.getElementById(focused.id)
      : null;
  nextFocus?.focus({ preventScroll: true });
});

export function renderAI() {
  const conversationKey = historyKey();
  const pending = pendingConversations.get(conversationKey);
  let history;
  try {
    history = pending?.history || JSON.parse(sessionStorage.getItem(conversationKey) || '[]');
  } catch {
    history = [];
  }
  renderShell(
    'ai',
    `<section class="ai-page"><div class="ai-layout"><aside class="ai-sidebar"><section class="ai-prompt-card fi-card"><h2><span>↗</span> Rekomendasi populer</h2>${prompts.map((prompt, index) => `<button class="ai-prompt" type="button" data-prompt="${index}"><span>${[icon('recycle'), icon('guide'), icon('box'), icon('leaf')][index]}</span>${prompt}</button>`).join('')}</section><section class="ai-tip-card"><span>${icon('sparkles')}</span><p class="ai-kicker">TIPS SINGKAT</p><p>Pisahkan sisa pangan dari kemasan plastik dan bahan nonorganik sebelum mengolahnya.</p></section><a class="ai-side-link" href="#tambah-limbah">Minta insight untuk penawaran <span>→</span></a></aside><section class="ai-chat fi-card"><header class="ai-chat-head"><span class="ai-bot-avatar">${icon('sparkles')}</span><div><strong>Ilee Assistant</strong><small><i></i> Asisten pengelolaan limbah organik</small></div><button type="button" id="ai-clear" aria-label="Mulai percakapan baru">↻</button></header><div class="ai-messages" id="ai-messages" role="log" aria-label="Percakapan dengan Ilee Assistant" aria-live="polite" aria-relevant="additions">${history.length ? history.map(messageMarkup).join('') : `<div class="ai-welcome"><span>${icon('sparkles')}</span><h2>Ada yang ingin Anda olah?</h2><p>Tanyakan tentang kategori, penyimpanan, harga, atau pemanfaatan bahan organik.</p><small>Hindari membagikan informasi pribadi.</small></div>`}</div><form class="ai-form" id="ai-form"><input id="ai-input" name="message" aria-label="Pertanyaan untuk Ilee Assistant" autocomplete="off" maxlength="1000" placeholder="Ketik pertanyaan Anda…" required><button type="submit" aria-label="Kirim pertanyaan">➤</button></form><p class="ai-disclaimer">Jawaban AI dapat keliru. Periksa informasi penting sebelum mengambil keputusan.</p></section></div></section>`,
  );
  injectAIStyles();
  const messages = document.getElementById('ai-messages');
  if (pending) {
    messages.insertAdjacentHTML(
      'beforeend',
      '<div class="ai-typing"><i></i><i></i><i></i><span>Menyiapkan jawaban…</span></div>',
    );
    document.querySelectorAll('[data-prompt]').forEach((button) => {
      button.disabled = true;
    });
    document.getElementById('ai-clear').disabled = true;
    document.querySelector('#ai-form button').disabled = true;
  }
  if (history.length) messages.scrollTop = messages.scrollHeight;
  document
    .querySelectorAll('[data-prompt]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        submitPrompt(translate(prompts[Number(button.dataset.prompt)])),
      ),
    );
  document.getElementById('ai-form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitPrompt(document.getElementById('ai-input').value);
  });
  document.getElementById('ai-clear').addEventListener('click', () => {
    sessionStorage.removeItem(historyKey());
    renderAI();
  });
}

function messageMarkup(message) {
  const content =
    message.role === 'user'
      ? escapeHtml(message.text).replaceAll('\n', '<br>')
      : renderMarkdown(message.text);
  return `<article class="ai-message ${message.role === 'user' ? 'user' : 'assistant'}"><div>${content}</div><small>${message.role === 'user' ? 'ANDA' : 'ILEE AI'}</small></article>`;
}

async function submitPrompt(text) {
  const conversationKey = historyKey();
  const question = String(text || '').trim();
  if (!question) return;
  const input = document.getElementById('ai-input');
  const form = document.getElementById('ai-form');
  const send = form?.querySelector('button');
  const messages = document.getElementById('ai-messages');
  if (!messages || !form || send?.disabled) return;
  const promptButtons = [...document.querySelectorAll('[data-prompt]')];
  promptButtons.forEach((button) => {
    button.disabled = true;
  });
  const clearButton = document.getElementById('ai-clear');
  if (clearButton) clearButton.disabled = true;
  let history;
  try {
    history = JSON.parse(sessionStorage.getItem(conversationKey) || '[]');
  } catch {
    history = [];
  }
  history.push({ role: 'user', text: question });
  pendingConversations.set(conversationKey, { history });
  messages.innerHTML =
    history.map(messageMarkup).join('') +
    '<div class="ai-typing"><i></i><i></i><i></i><span>Menyiapkan jawaban…</span></div>';
  messages.scrollTop = messages.scrollHeight;
  if (input) input.value = '';
  if (send) send.disabled = true;
  try {
    const result = await askAI(question);
    if (!result.success)
      throw new Error(result.message || 'Asisten belum dapat menjawab. Silakan coba kembali.');
    const answer =
      typeof result.data === 'string'
        ? result.data
        : result.data?.response || result.data?.message || JSON.stringify(result.data);
    history.push({ role: 'assistant', text: answer });
  } catch (error) {
    history.push({
      role: 'assistant',
      text: error.message || 'Koneksi ke asisten terputus. Silakan coba lagi.',
    });
    if (location.hash === '#tanya-ai' && historyKey() === conversationKey)
      showToast(error.message || 'Asisten belum dapat menjawab.', 'error');
  } finally {
    sessionStorage.setItem(conversationKey, JSON.stringify(history));
    pendingConversations.delete(conversationKey);
    if (location.hash === '#tanya-ai' && historyKey() === conversationKey) {
      const visibleMessages = document.getElementById('ai-messages');
      if (visibleMessages) {
        visibleMessages.innerHTML = history.map(messageMarkup).join('');
        visibleMessages.scrollTop = visibleMessages.scrollHeight;
      }
      document.querySelectorAll('[data-prompt]').forEach((button) => {
        button.disabled = false;
      });
      const visibleClear = document.getElementById('ai-clear');
      const visibleSend = document.querySelector('#ai-form button');
      if (visibleClear) visibleClear.disabled = false;
      if (visibleSend) visibleSend.disabled = false;
      if (input?.isConnected) input.focus();
    }
  }
}

function injectAIStyles() {
  loadStylesheet('ai-page-style', new URL('../../styles/pages/ai.css', import.meta.url));
}
