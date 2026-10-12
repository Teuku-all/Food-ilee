import { renderShell, showToast } from '../../ui/shell.js';
import { escapeHtml } from '../../utils/html.js';
import { getCurrentUser } from '../../services/user.js';
import { getChats, getMessages, sendChatMessage } from '../../services/chat.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { connectSocket, getSocket } from '../../services/socket.js';

let chats = [];
let selectedChatId = '';
let currentUserId = '';
let joinedChatId = '';
let liveSocket = null;
let socketConnectHandler = null;
let socketMessageHandler = null;
let socketBindRevision = 0;

window.addEventListener('hashchange', () => {
  if (location.hash !== '#chat') leaveSocketChat();
});

export async function renderChat() {
  const revision = getNavigationRevision();
  renderShell(
    'chat',
    '<section class="ch-page"><div class="ch-state fi-card">Memuat pesan…</div></section>',
  );
  injectStyles();
  try {
    const [profile, result] = await Promise.all([getCurrentUser(), getChats()]);
    if (!isRouteCurrent('#chat', revision)) return;
    currentUserId = profile.data?.id || '';
    chats = Array.isArray(result) ? result : [];
    const wantedId = sessionStorage.getItem('foodilee_chat_id') || '';
    selectedChatId = chats.some((chat) => chat.id === wantedId) ? wantedId : chats[0]?.id || '';
    renderChatView(revision);
  } catch (error) {
    if (!isRouteCurrent('#chat', revision)) return;
    renderShell(
      'chat',
      `<section class="ch-page"><div class="ch-state fi-card"><h1>Pesan belum dapat dimuat</h1><p>${escapeHtml(error.message || 'Periksa koneksi ke server.')}</p><button class="fi-button" type="button" data-chat-retry>Coba lagi</button></div></section>`,
    );
    injectStyles();
    document.querySelector('[data-chat-retry]')?.addEventListener('click', renderChat);
  }
}

function renderChatView(revision) {
  const selected = chats.find((chat) => chat.id === selectedChatId);
  renderShell(
    'chat',
    `<section class="ch-page"><header class="ch-heading"><div><p class="ch-kicker">KOMUNIKASI FOOD ILEE</p><h1>Pesan</h1><p>Hubungi pembeli atau penjual untuk koordinasi.</p></div></header><div class="ch-layout fi-card"><aside class="ch-inbox" aria-label="Daftar percakapan">${chats.length ? chats.map(chatItem).join('') : '<div class="ch-empty">Belum ada percakapan.<br>Mulai chat dari detail produk di marketplace.</div>'}</aside><section class="ch-conversation" aria-label="Isi percakapan">${selected ? `<header class="ch-person"><span class="ch-avatar">${escapeHtml(initials(otherUser(selected)))}</span><div><strong>${escapeHtml(displayName(otherUser(selected)))}</strong><small>Diskusi transaksi Food Ilee</small></div></header><div class="ch-messages" data-chat-messages><div class="ch-empty">Memuat pesan…</div></div><form class="ch-compose"><input name="text" maxlength="4000" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan"><button class="fi-button" type="submit">Kirim</button></form>` : '<div class="ch-welcome"><span>✳</span><h2>Percakapan Anda</h2><p>Pilih percakapan untuk melihat pesan, atau mulai chat melalui detail produk.</p><a class="fi-button" href="#marketplace">Buka marketplace</a></div>'}</section></div></section>`,
  );
  injectStyles();
  document.querySelectorAll('[data-chat-select]').forEach((button) =>
    button.addEventListener('click', () => {
      selectedChatId = button.dataset.chatSelect;
      sessionStorage.setItem('foodilee_chat_id', selectedChatId);
      renderChatView(revision);
    }),
  );
  if (selected) {
    loadConversation(selected.id, revision);
    bindLiveChat(selected.id, revision);
    document
      .querySelector('.ch-compose')
      ?.addEventListener('submit', (event) => submitMessage(event, selected.id, revision));
  }
}

async function bindLiveChat(chatId, revision) {
  const bindRevision = ++socketBindRevision;
  liveSocket = getSocket();
  if (joinedChatId && joinedChatId !== chatId) liveSocket?.emit('leave_chat', joinedChatId);
  if (socketConnectHandler) liveSocket?.off('connect', socketConnectHandler);
  if (socketMessageHandler) liveSocket?.off('receive_message', socketMessageHandler);
  try {
    liveSocket = await connectSocket();
  } catch {
    return; // Pengiriman pesan tetap tersedia melalui REST.
  }
  if (!liveSocket) return;
  if (bindRevision !== socketBindRevision) return;
  if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) {
    liveSocket.disconnect();
    liveSocket = null;
    return;
  }
  if (!liveSocket.connected) {
    try {
      liveSocket = await connectSocket();
    } catch {
      return;
    }
  }
  if (bindRevision !== socketBindRevision) return;
  if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) {
    liveSocket.disconnect();
    liveSocket = null;
    return;
  }
  joinedChatId = chatId;
  socketConnectHandler = () => {
    if (isRouteCurrent('#chat', revision) && selectedChatId === chatId)
      liveSocket.emit('join_chat', chatId);
  };
  socketMessageHandler = (message) => {
    if (
      !isRouteCurrent('#chat', revision) ||
      selectedChatId !== chatId ||
      message.senderId === currentUserId
    )
      return;
    const box = document.querySelector('[data-chat-messages]');
    if (!box) return;
    const date = new Date(message.createdAt);
    const time = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    box.insertAdjacentHTML(
      'beforeend',
      `<article class="ch-bubble"><p>${escapeHtml(message.text)}</p><time>${escapeHtml(time)}</time></article>`,
    );
    box.scrollTop = box.scrollHeight;
  };
  liveSocket.on('connect', socketConnectHandler);
  liveSocket.on('receive_message', socketMessageHandler);
  if (liveSocket.connected) socketConnectHandler();
}

function leaveSocketChat() {
  socketBindRevision += 1;
  if (joinedChatId) liveSocket?.emit('leave_chat', joinedChatId);
  joinedChatId = '';
  if (socketConnectHandler) liveSocket?.off('connect', socketConnectHandler);
  if (socketMessageHandler) liveSocket?.off('receive_message', socketMessageHandler);
  socketConnectHandler = null;
  socketMessageHandler = null;
  if (liveSocket?.connected) liveSocket.disconnect();
  liveSocket = null;
}

function chatItem(chat) {
  const other = otherUser(chat);
  const last = chat.messages?.[0];
  return `<button class="ch-chat-item${chat.id === selectedChatId ? ' active' : ''}" type="button" data-chat-select="${escapeHtml(chat.id)}"><span class="ch-avatar">${escapeHtml(initials(other))}</span><span class="ch-chat-copy"><strong>${escapeHtml(displayName(other))}</strong><small>${escapeHtml(last?.text || 'Mulai percakapan')}</small></span></button>`;
}

function otherUser(chat) {
  return chat.buyerId === currentUserId ? chat.seller : chat.buyer;
}
function displayName(user) {
  return user?.name || user?.username || user?.email || 'Pengguna Food Ilee';
}
function initials(user) {
  return displayName(user).slice(0, 1).toUpperCase();
}

async function loadConversation(chatId, revision) {
  try {
    const messages = await getMessages(chatId);
    if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
    const box = document.querySelector('[data-chat-messages]');
    if (!box) return;
    box.innerHTML = messages.length
      ? messages
          .map((message) => {
            const date = new Date(message.createdAt);
            const time = Number.isNaN(date.getTime())
              ? ''
              : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            return `<article class="ch-bubble${message.senderId === currentUserId ? ' mine' : ''}"><p>${escapeHtml(message.text)}</p><time>${escapeHtml(time)}</time></article>`;
          })
          .join('')
      : '<div class="ch-empty">Belum ada pesan. Kirim pesan pertama Anda.</div>';
    box.scrollTop = box.scrollHeight;
  } catch (error) {
    if (isRouteCurrent('#chat', revision)) showToast(error.message, 'error');
  }
}

async function submitMessage(event, chatId, revision) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.text;
  const text = input.value.trim();
  if (!text) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await sendChatMessage(chatId, text);
    if (!isRouteCurrent('#chat', revision)) return;
    input.value = '';
    chats = await getChats();
    if (!isRouteCurrent('#chat', revision)) return;
    renderChatView(revision);
  } catch (error) {
    showToast(error.message || 'Pesan belum terkirim.', 'error');
    button.disabled = false;
  }
}

function injectStyles() {
  if (document.getElementById('chat-page-style')) return;
  const style = document.createElement('style');
  style.id = 'chat-page-style';
  style.textContent =
    '.ch-page{max-width:1100px;margin:0 auto}.ch-heading{margin-bottom:22px}.ch-kicker{margin:0 0 7px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}.ch-heading h1{margin:0;color:var(--fi-deep);font-size:clamp(29px,4vw,38px);letter-spacing:-.04em}.ch-heading p:not(.ch-kicker){margin:8px 0 0;color:var(--fi-muted);font-size:14px}.ch-layout{min-height:570px;display:grid;grid-template-columns:minmax(235px,310px) minmax(0,1fr);overflow:hidden}.ch-inbox{border-right:1px solid var(--fi-line);background:#e5f0ef}.ch-chat-item{width:100%;min-height:76px;padding:12px;border:0;border-bottom:1px solid #cbdedc;display:flex;align-items:center;gap:11px;background:transparent;text-align:left;cursor:pointer}.ch-chat-item:hover,.ch-chat-item.active{background:#f6fbfa}.ch-avatar{width:39px;height:39px;flex:none;border-radius:50%;display:grid;place-items:center;background:#cfe7e4;color:#075653;font-size:14px;font-weight:700}.ch-chat-copy{min-width:0;display:grid;gap:5px}.ch-chat-copy strong{overflow:hidden;color:#173d3c;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.ch-chat-copy small{overflow:hidden;color:#708582;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.ch-conversation{min-width:0;display:flex;flex-direction:column;background:#f8fbfa}.ch-person{min-height:69px;padding:12px 17px;border-bottom:1px solid #dce8e6;display:flex;align-items:center;gap:11px}.ch-person div{display:grid;gap:4px}.ch-person strong{color:#173d3c;font-size:13px}.ch-person small{color:#829592;font-size:10px}.ch-messages{flex:1;min-height:375px;max-height:500px;padding:19px;overflow-y:auto;display:flex;flex-direction:column;align-items:flex-start;gap:10px}.ch-bubble{max-width:min(78%,520px);padding:11px 13px;border-radius:15px 15px 15px 4px;background:#e5efee;color:#244b49}.ch-bubble.mine{align-self:flex-end;border-radius:15px 15px 4px 15px;background:#075653;color:#f3fbfa}.ch-bubble p{margin:0;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.ch-bubble time{display:block;margin-top:5px;font-size:9px;opacity:.68;text-align:right}.ch-compose{padding:13px;border-top:1px solid #dce8e6;display:flex;gap:9px;background:#fff}.ch-compose input{min-width:0;flex:1;height:43px;padding:0 14px;border:1px solid #d1e1df;border-radius:999px;outline:none;font:400 12px Inter,Arial,sans-serif}.ch-compose input:focus{border-color:#4d9d98;box-shadow:0 0 0 3px #087b7815}.ch-compose .fi-button{min-height:43px}.ch-empty,.ch-state{padding:24px;color:#718582;font-size:12px;line-height:1.7;text-align:center}.ch-empty{margin:auto}.ch-state{min-height:250px;border:1px solid var(--fi-line);border-radius:22px;display:grid;place-content:center;gap:10px;background:var(--fi-card)}.ch-state h1{color:var(--fi-deep)}.ch-state .fi-button{justify-self:center}.ch-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center}.ch-welcome>span{width:50px;height:50px;border-radius:17px;display:grid;place-items:center;background:#d8eeeb;color:#087b78;font-size:24px}.ch-welcome h2{margin:15px 0 4px;color:#173d3c;font-size:20px}.ch-welcome p{max-width:350px;color:#718582;font-size:12px;line-height:1.7}.ch-welcome .fi-button{margin-top:8px}@media(max-width:700px){.ch-layout{grid-template-columns:1fr;min-height:0}.ch-inbox{max-height:210px;border-right:0;border-bottom:1px solid var(--fi-line);overflow:auto}.ch-chat-item{min-height:62px}.ch-messages{min-height:280px;max-height:48vh;padding:13px}.ch-conversation{min-height:420px}.ch-compose{padding:10px}.ch-compose .fi-button{padding:0 15px}}';
  document.head.append(style);
}
