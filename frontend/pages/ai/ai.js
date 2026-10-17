import { askAI } from '../../services/ai.js';
import { escapeHtml } from '../../utils/html.js';
import { renderShell, showToast } from '../../ui/shell.js';

const prompts = [
  'Apakah sisa sayuran cocok untuk kompos?',
  'Bagaimana cara menyimpan limbah organik?',
  'Bagaimana menentukan harga yang menarik?',
  'Limbah apa yang cocok untuk pakan ternak?',
];
const historyKey = 'foodilee_ai_conversation_v1';

export function renderAI() {
  let history;
  try {
    history = JSON.parse(sessionStorage.getItem(historyKey) || '[]');
  } catch {
    history = [];
  }
  renderShell(
    'ai',
    `<section class="ai-page"><div class="ai-heading"><div><p class="ai-kicker">ASISTEN PENGELOLAAN ORGANIK</p><h1>Tanya AI Food Ilee</h1><p>Dapatkan saran awal untuk memanfaatkan limbah pangan dengan lebih baik.</p></div><span class="ai-heading-status"><i></i> Terhubung ke Food Ilee AI</span></div><div class="ai-layout"><aside class="ai-sidebar"><section class="ai-prompt-card fi-card"><h2><span>↗</span> Rekomendasi populer</h2>${prompts.map((prompt, index) => `<button class="ai-prompt" type="button" data-prompt="${index}"><span>${['↻', '▤', 'Rp', '♧'][index]}</span>${prompt}</button>`).join('')}</section><section class="ai-tip-card"><span>✳</span><p class="ai-kicker">TIPS SINGKAT</p><p>Pisahkan sisa pangan dari kemasan plastik dan bahan nonorganik sebelum mengolahnya.</p></section><a class="ai-side-link" href="#tambah-limbah">Minta insight untuk penawaran <span>→</span></a></aside><section class="ai-chat fi-card"><header class="ai-chat-head"><span class="ai-bot-avatar">✳</span><div><strong>Ilee Assistant</strong><small><i></i> Asisten pengelolaan limbah organik</small></div><button type="button" id="ai-clear" aria-label="Mulai percakapan baru">↻</button></header><div class="ai-messages" id="ai-messages">${history.length ? history.map(messageMarkup).join('') : `<div class="ai-welcome"><span>✳</span><h2>Ada yang ingin Anda olah?</h2><p>Tanyakan tentang kategori, penyimpanan, harga, atau pemanfaatan bahan organik.</p><small>Hindari membagikan informasi pribadi.</small></div>`}</div><form class="ai-form" id="ai-form"><input id="ai-input" name="message" autocomplete="off" maxlength="1000" placeholder="Ketik pertanyaan Anda…" required><button type="submit" aria-label="Kirim pertanyaan">➤</button></form><p class="ai-disclaimer">Jawaban AI dapat keliru. Periksa informasi penting sebelum mengambil keputusan.</p></section></div></section>`,
  );
  injectAIStyles();
  const messages = document.getElementById('ai-messages');
  if (history.length) messages.scrollTop = messages.scrollHeight;
  document
    .querySelectorAll('[data-prompt]')
    .forEach((button) =>
      button.addEventListener('click', () => submitPrompt(prompts[Number(button.dataset.prompt)])),
    );
  document.getElementById('ai-form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitPrompt(document.getElementById('ai-input').value);
  });
  document.getElementById('ai-clear').addEventListener('click', () => {
    sessionStorage.removeItem(historyKey);
    renderAI();
  });
}

function messageMarkup(message) {
  return `<article class="ai-message ${message.role === 'user' ? 'user' : 'assistant'}"><div>${escapeHtml(message.text).replaceAll('\n', '<br>')}</div><small>${message.role === 'user' ? 'ANDA' : 'ILEE AI'}</small></article>`;
}

async function submitPrompt(text) {
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
    history = JSON.parse(sessionStorage.getItem(historyKey) || '[]');
  } catch {
    history = [];
  }
  history.push({ role: 'user', text: question });
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
    sessionStorage.setItem(historyKey, JSON.stringify(history));
    messages.innerHTML = history.map(messageMarkup).join('');
    messages.scrollTop = messages.scrollHeight;
  } catch (error) {
    history.push({
      role: 'assistant',
      text: error.message || 'Koneksi ke asisten terputus. Silakan coba lagi.',
    });
    messages.innerHTML = history.map(messageMarkup).join('');
    messages.scrollTop = messages.scrollHeight;
    showToast(error.message || 'Asisten belum dapat menjawab.', 'error');
  } finally {
    promptButtons.forEach((button) => {
      if (button.isConnected) button.disabled = false;
    });
    if (clearButton?.isConnected) clearButton.disabled = false;
    if (send?.isConnected) send.disabled = false;
    input?.focus();
  }
}

function injectAIStyles() {
  if (document.getElementById('ai-page-style')) return;
  const style = document.createElement('style');
  style.id = 'ai-page-style';
  style.textContent = `.ai-page{padding:3px 0 10px}.ai-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:29px}.ai-kicker{margin:0 0 7px;color:#708c7d;font-size:9px;font-weight:700;letter-spacing:.14em}.ai-heading h1{margin:0;color:#104b3e;font-size:37px;font-weight:550;letter-spacing:-1px}.ai-heading>div>p:last-child{margin:8px 0 0;color:#6a7770;font-size:14px}.ai-heading-status{display:flex;align-items:center;gap:7px;color:#6a7b72;font-size:10px}.ai-heading-status i,.ai-chat-head small i{width:7px;height:7px;border-radius:50%;display:inline-block;background:#3eaf78;box-shadow:0 0 0 3px #3eaf781c}.ai-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:22px}.ai-sidebar{display:flex;flex-direction:column;gap:15px}.ai-prompt-card{padding:21px 18px;border-radius:21px;background:#fafbf9}.ai-prompt-card h2{margin:0 0 17px;color:#1e5545;font-size:16px;font-weight:550}.ai-prompt-card h2 span{margin-right:7px}.ai-prompt{width:100%;min-height:54px;margin-top:9px;padding:10px 12px;border:1px solid #e8ede9;border-radius:999px;display:flex;align-items:center;gap:11px;background:#fff;color:#4f5d56;text-align:left;font:500 10px/1.5 Inter,Arial,sans-serif;cursor:pointer;transition:border .15s,transform .15s}.ai-prompt:hover{transform:translateX(2px);border-color:#a5c4b3}.ai-prompt>span{width:27px;height:27px;flex:none;border-radius:50%;display:grid;place-items:center;background:#e6f3e9;color:#22674e;font-size:12px;font-weight:600}.ai-tip-card{position:relative;padding:19px;border-radius:22px;overflow:hidden;background:#dcefeb}.ai-tip-card:after{content:'◯';position:absolute;right:-21px;bottom:-66px;color:#bfded9;font-size:130px}.ai-tip-card>span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ffffffb8;color:#287c75}.ai-tip-card .ai-kicker{margin:12px 0 5px;color:#3e7873}.ai-tip-card>p:last-of-type{position:relative;z-index:1;max-width:235px;margin:0;color:#56716f;font-size:11px;line-height:1.65}.ai-side-link{display:flex;justify-content:space-between;color:#3d715d;text-decoration:none;font-size:10px;font-weight:600;padding:4px 3px}.ai-chat{min-height:550px;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;box-shadow:0 9px 28px #123a2a0a}.ai-chat-head{height:65px;flex:none;padding:0 19px;border-bottom:1px solid #edf0ed;display:flex;align-items:center;gap:10px}.ai-bot-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#e2f2e7;color:#176457;font-size:17px}.ai-chat-head>div{display:flex;flex-direction:column;gap:4px}.ai-chat-head strong{color:#315c49;font-size:12px;font-weight:600}.ai-chat-head small{display:flex;align-items:center;gap:6px;color:#78847c;font-size:9px}.ai-chat-head small i{width:5px;height:5px;box-shadow:none}.ai-chat-head>button{width:33px;height:33px;margin-left:auto;border:0;border-radius:50%;background:#f4f6f3;color:#617169;font-size:16px;cursor:pointer}.ai-messages{min-height:380px;max-height:calc(100vh - 430px);flex:1;padding:22px 25px;overflow:auto;background:#fbfcfa}.ai-welcome{min-height:310px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.ai-welcome>span{width:48px;height:48px;border-radius:17px;display:grid;place-items:center;background:#e1f0ee;color:#176d69;font-size:22px}.ai-welcome h2{margin:15px 0 6px;color:#2e493a;font-size:19px;font-weight:550}.ai-welcome p{max-width:340px;margin:0;color:#758078;font-size:12px;line-height:1.7}.ai-welcome small{margin-top:19px;color:#a0a9a2;font-size:9px}.ai-message{max-width:80%;margin:0 0 19px}.ai-message>div{padding:14px 16px;border:1px solid #edf1ed;border-radius:17px 17px 17px 4px;background:#fff;color:#48554e;font-size:12px;line-height:1.7;box-shadow:0 3px 10px #123a2a05}.ai-message.user{margin-left:auto}.ai-message.user>div{border-color:#005448;background:#005448;color:white;border-radius:17px 17px 4px 17px}.ai-message small{display:block;margin:7px 5px 0;color:#9aa49d;font-size:8px;letter-spacing:.09em}.ai-message.user small{text-align:right}.ai-typing{display:flex;align-items:center;gap:5px;color:#89948d;font-size:10px}.ai-typing i{width:5px;height:5px;border-radius:50%;background:#75aa8c;animation:ai-bounce .7s ease-in-out infinite alternate}.ai-typing i:nth-child(2){animation-delay:.13s}.ai-typing i:nth-child(3){animation-delay:.26s}.ai-typing span{margin-left:5px}@keyframes ai-bounce{to{transform:translateY(-4px);opacity:.5}}.ai-form{min-height:58px;margin:14px 18px 0;padding:5px 6px 5px 17px;border:1px solid #e2e8e3;border-radius:999px;display:flex;align-items:center;gap:10px;background:#f4f5f2}.ai-form input{min-width:0;flex:1;border:0;outline:none;background:transparent;color:#263b30;font:400 12px Inter,Arial,sans-serif}.ai-form input::placeholder{color:#98a39c}.ai-form button{width:43px;height:43px;border:0;border-radius:50%;background:#005448;color:white;font-size:16px;cursor:pointer}.ai-form button:disabled{opacity:.6}.ai-disclaimer{margin:10px 20px 14px;color:#9aa39d;font-size:8px;text-align:center}@media(max-width:780px){.ai-layout{grid-template-columns:1fr}.ai-sidebar{display:grid;grid-template-columns:1fr 1fr;align-items:start}.ai-prompt-card{grid-row:span 2}.ai-heading-status{display:none}.ai-messages{max-height:480px}}@media(max-width:560px){.ai-heading h1{font-size:29px}.ai-heading>div>p:last-child{font-size:12px;line-height:1.6}.ai-sidebar{grid-template-columns:1fr}.ai-prompt-card{grid-row:auto}.ai-tip-card{display:none}.ai-chat{min-height:520px}.ai-messages{padding:17px 13px}.ai-message{max-width:91%}.ai-chat-head{padding:0 13px}.ai-form{margin:10px 10px 0}.ai-disclaimer{margin:9px 11px 12px;font-size:8px}}`;
  style.textContent += `.ai-heading{position:relative;isolation:isolate;min-height:158px;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:25px;padding:27px 32px;border:1px solid #cfe1d2;border-radius:24px;background:radial-gradient(ellipse at 88% 20%,#d9eee0 0,transparent 32%),linear-gradient(115deg,#f8fbf7,#edf5ef 65%,#e4f1e8);box-shadow:0 12px 30px #174e320c}.ai-heading:before{position:absolute;z-index:-1;right:-40px;top:-150px;width:340px;height:340px;border:1px solid #a8cdb544;border-radius:50%;content:''}.ai-heading>div{position:relative;z-index:1;max-width:650px}.ai-kicker{display:inline-flex;align-items:center;margin:0 0 10px;padding:6px 10px;border:1px solid #cfe1d2;border-radius:999px;background:#ffffffa8;color:#557b61;font-size:9px;font-weight:700;letter-spacing:.14em}.ai-heading h1{font-weight:600}.ai-heading>div>p:last-child{color:#607369;line-height:1.6}.ai-heading-status{position:relative;z-index:1;padding:9px 12px;border:1px solid #d7e7da;border-radius:999px;background:#ffffffbd;color:#587361;white-space:nowrap}@media(max-width:560px){.ai-heading{min-height:0;align-items:flex-start;padding:22px 20px;border-radius:20px}.ai-heading:before{right:-200px;top:-185px}.ai-heading h1{font-size:29px}}`;
  document.head.append(style);
}
