import { renderShell, showToast } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';
import { escapeHtml } from '../../utils/html.js';
import { getCurrentUser } from '../../services/user.js';
import { getChats, getMessages, sendChatMessage } from '../../services/chat.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { connectSocket, getSocket } from '../../services/socket.js';
import { skeleton } from '../../ui/skeleton.js';

let chats = [];
let selectedChatId = '';
let currentUserId = '';
let joinedChatId = '';
let liveSocket = null;
let socketConnectHandler = null;
let socketMessageHandler = null;
let socketStatusHandler = null;
let socketBindRevision = 0;
let chatPollTimer = null;
const loadedChatsThisVisit = new Set();

window.addEventListener('hashchange', () => {
  if (location.hash !== '#chat') leaveSocketChat();
});

export async function renderChat() {
  const revision = getNavigationRevision();
  renderShell(
    'chat',
    chatLoadingSkeleton(),
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

function chatLoadingSkeleton() {
  return `<section class="ch-page" aria-busy="true"><div class="ch-layout fi-card"><aside class="ch-inbox">${Array.from({ length: 5 }, () => `<div class="ch-chat-item">${skeleton('39px', '39px', 'circle')}<div class="ch-chat-copy">${skeleton('130px', '12px')}${skeleton('100px', '10px')}</div></div>`).join('')}</aside><section class="ch-conversation"><header class="ch-person">${skeleton('39px', '39px', 'circle')}<div>${skeleton('120px', '12px')}${skeleton('170px', '10px')}</div></header><div class="ch-messages">${skeleton('48%', '39px', 'pill')}${skeleton('60%', '52px', 'pill')}<div style="align-self:flex-end;width:47%">${skeleton('100%', '43px', 'pill')}</div></div><div class="ch-compose">${skeleton('100%', '43px', 'pill')}${skeleton('75px', '43px', 'pill')}</div></section></div></section>`;
}

function renderChatView(revision) {
  const selected = chats.find((chat) => chat.id === selectedChatId);
  renderShell(
    'chat',
    `<section class="ch-page"><div class="ch-layout fi-card"><aside class="ch-inbox" aria-label="Daftar percakapan"><header class="ch-inbox-head"><div><strong>Percakapan</strong><small>Ruang koordinasi Anda</small></div><span>${chats.length}</span></header><label class="ch-search"><span aria-hidden="true">${icon('search')}</span><input type="search" data-chat-search placeholder="Cari percakapan" aria-label="Cari percakapan"></label><div class="ch-chat-list">${chats.length ? chats.map(chatItem).join('') : `<div class="ch-inbox-empty"><span aria-hidden="true">${icon('chat')}</span><strong>Mulai percakapan</strong><p>Hubungi penjual langsung dari detail produk yang menarik bagi Anda.</p></div>`}</div></aside><section class="ch-conversation" aria-label="Isi percakapan">${selected ? `<header class="ch-person"><span class="ch-avatar">${escapeHtml(initials(otherUser(selected)))}</span><div><strong>${escapeHtml(displayName(otherUser(selected)))}</strong><small>Diskusi transaksi Food Ilee</small></div></header><div class="ch-messages" data-chat-messages><div class="ch-empty">Memuat pesan…</div></div><form class="ch-compose"><input name="text" maxlength="4000" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan"><button class="fi-button" type="submit">Kirim</button></form>` : `<div class="ch-welcome"><span>${icon('sparkles')}</span><h2>Percakapan Anda</h2><p>Pilih percakapan untuk melihat pesan, atau mulai chat melalui detail produk.</p><a class="fi-button" href="#marketplace">Buka marketplace</a></div>`}</section></div></section>`,
  );
  injectStyles();
  document.querySelectorAll('[data-chat-select]').forEach((button) =>
    button.addEventListener('click', () => {
      selectChat(button.dataset.chatSelect, revision);
    }),
  );
  document.querySelector('[data-chat-search]')?.addEventListener('input', (event) => {
    const query = event.currentTarget.value.trim().toLocaleLowerCase('id-ID');
    document.querySelectorAll('.ch-chat-item').forEach((item) => {
      item.hidden = !item.textContent.toLocaleLowerCase('id-ID').includes(query);
    });
  });
  if (selected) renderConversation(selected.id, revision);
}

function selectChat(chatId, revision) {
  if (chatId === selectedChatId) return;
  selectedChatId = chatId;
  sessionStorage.setItem('foodilee_chat_id', chatId);
  document.querySelectorAll('[data-chat-select]').forEach((button) => {
    button.classList.toggle('active', button.dataset.chatSelect === chatId);
  });
  renderConversation(chatId, revision);
}

function renderConversation(chatId, revision) {
  const selected = chats.find((chat) => chat.id === chatId);
  const pane = document.querySelector('.ch-conversation');
  if (!pane || !selected) return;
  pane.innerHTML = `<header class="ch-person"><span class="ch-avatar">${escapeHtml(initials(otherUser(selected)))}</span><div><strong>${escapeHtml(displayName(otherUser(selected)))}</strong><small>Diskusi transaksi Food Ilee</small></div></header><div class="ch-messages" data-chat-messages><div class="ch-empty">Memuat pesan…</div></div><form class="ch-compose"><input name="text" maxlength="4000" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan"><button class="fi-button" type="submit">Kirim</button></form>`;
  loadConversation(chatId, revision);
  bindLiveChat(chatId, revision);
  pane.querySelector('.ch-compose')?.addEventListener('submit', (event) => submitMessage(event, chatId, revision));
}

async function bindLiveChat(chatId, revision) {
  const bindRevision = ++socketBindRevision;
  if (globalThis.FOODILEE_CONFIG?.realtime === false) {
    startChatPolling(chatId, revision);
    return;
  }
  liveSocket = getSocket();
  if (joinedChatId && joinedChatId !== chatId) liveSocket?.emit('leave_chat', joinedChatId);
  if (socketConnectHandler) liveSocket?.off('connect', socketConnectHandler);
  if (socketMessageHandler) liveSocket?.off('receive_message', socketMessageHandler);
  if (socketStatusHandler) liveSocket?.off('message_status', socketStatusHandler);
  try {
    liveSocket = await connectSocket();
  } catch {
    startChatPolling(chatId, revision);
    return; // Pengiriman pesan tetap tersedia melalui REST.
  }
  if (!liveSocket) {
    startChatPolling(chatId, revision);
    return;
  }
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
      startChatPolling(chatId, revision);
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
    if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
    if (message.senderId === currentUserId) return;
    const box = document.querySelector('[data-chat-messages]');
    if (!box) return;
    appendMessage(box, message);
    saveCachedMessage(chatId, message);
    updateChatPreview(chatId, message.text);
    box.scrollTop = box.scrollHeight;
  };
  socketStatusHandler = (status) => {
    if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
    updateMessageStatus(status);
  };
  liveSocket.on('connect', socketConnectHandler);
  liveSocket.on('receive_message', socketMessageHandler);
  liveSocket.on('message_status', socketStatusHandler);
  if (liveSocket.connected) socketConnectHandler();
}

function leaveSocketChat() {
  socketBindRevision += 1;
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = null;
  loadedChatsThisVisit.clear();
  if (joinedChatId) liveSocket?.emit('leave_chat', joinedChatId);
  joinedChatId = '';
  if (socketConnectHandler) liveSocket?.off('connect', socketConnectHandler);
  if (socketMessageHandler) liveSocket?.off('receive_message', socketMessageHandler);
  if (socketStatusHandler) liveSocket?.off('message_status', socketStatusHandler);
  socketConnectHandler = null;
  socketMessageHandler = null;
  socketStatusHandler = null;
  if (liveSocket?.connected) liveSocket.disconnect();
  liveSocket = null;
}

function startChatPolling(chatId, revision) {
  if (chatPollTimer) clearInterval(chatPollTimer);
  const poll = async () => {
    if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
    try {
      const messages = await getMessages(chatId);
      if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
      const box = document.querySelector('[data-chat-messages]');
      if (!box) return;
      for (const message of messages) {
        const existed = Boolean(box.querySelector(`[data-message-id="${CSS.escape(String(message.id))}"]`));
        saveCachedMessage(chatId, message);
        if (existed) {
          if (message.senderId === currentUserId) updateMessageStatus(message);
          continue;
        }
        appendMessage(box, message);
        updateChatPreview(chatId, message.text);
      }
      if (messages.length) box.scrollTop = box.scrollHeight;
    } catch {
      // A later polling cycle retries transient API or network failures.
    }
  };
  poll();
  chatPollTimer = setInterval(poll, 5000);
}

function chatItem(chat) {
  const other = otherUser(chat);
  const last = chat.messages?.[0];
  return `<button class="ch-chat-item${chat.id === selectedChatId ? ' active' : ''}" type="button" data-chat-select="${escapeHtml(chat.id)}"><span class="ch-avatar">${escapeHtml(initials(other))}</span><span class="ch-chat-copy"><strong>${escapeHtml(displayName(other))}</strong><small ${last?.text ? 'data-no-translate' : ''}>${escapeHtml(last?.text || 'Mulai percakapan')}</small></span></button>`;
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
  const box = document.querySelector('[data-chat-messages]');
  if (!box) return;
  const cached = getCachedMessages(chatId);
  if (cached !== null) {
    renderMessages(box, cached);
  }
  if (loadedChatsThisVisit.has(chatId)) return;
  loadedChatsThisVisit.add(chatId);
  try {
    const messages = await getMessages(chatId);
    const mergedMessages = mergeMessages(getCachedMessages(chatId) || [], messages);
    cacheMessages(chatId, mergedMessages);
    if (!isRouteCurrent('#chat', revision) || selectedChatId !== chatId) return;
    const currentBox = document.querySelector('[data-chat-messages]');
    if (currentBox) renderMessages(currentBox, mergedMessages);
  } catch (error) {
    loadedChatsThisVisit.delete(chatId);
    if (isRouteCurrent('#chat', revision)) showToast(error.message, 'error');
  }
}

function renderMessages(box, messages) {
  box.innerHTML = messages.length
    ? messages.map((message) => {
        const date = new Date(message.createdAt);
        const time = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return messageMarkup(message, time);
      }).join('')
    : '<div class="ch-empty">Belum ada pesan. Kirim pesan pertama Anda.</div>';
  box.scrollTop = box.scrollHeight;
}

function chatCacheKey(chatId) {
  return `foodilee_chat_messages:${currentUserId}:${chatId}`;
}

function getCachedMessages(chatId) {
  try {
    const cached = localStorage.getItem(chatCacheKey(chatId));
    if (cached === null) return null;
    const messages = JSON.parse(cached);
    return Array.isArray(messages) ? messages : null;
  } catch {
    return null;
  }
}

function mergeMessages(existing, latest) {
  const byId = new Map(existing.map((message) => [message.id, message]));
  for (const message of latest) {
    byId.set(message.id, { ...byId.get(message.id), ...message });
  }
  return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function cacheMessages(chatId, messages) {
  try {
    localStorage.setItem(chatCacheKey(chatId), JSON.stringify(messages));
  } catch {
    // The conversation remains usable in memory if browser storage is unavailable.
  }
}

function saveCachedMessage(chatId, message) {
  const messages = getCachedMessages(chatId) || [];
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) messages.push(message);
  else messages[index] = { ...messages[index], ...message };
  messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  cacheMessages(chatId, messages);
}

async function submitMessage(event, chatId, revision) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.text;
  const text = input.value.trim();
  if (!text) return;
  const button = form.querySelector('button');
  button.disabled = true;
  const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pendingMessage = { id: pendingId, text, senderId: currentUserId, createdAt: new Date().toISOString() };
  const box = document.querySelector('[data-chat-messages]');
  if (box) {
    box.querySelector('.ch-empty')?.remove();
    appendMessage(box, pendingMessage, 'pending');
    box.scrollTop = box.scrollHeight;
  }
  input.value = '';
  try {
    const message = await sendChatMessage(chatId, text);
    saveCachedMessage(chatId, message);
    if (!isRouteCurrent('#chat', revision)) return;
    const pendingBubble = document.querySelector(`[data-message-id="${pendingId}"]`);
    if (pendingBubble) {
      pendingBubble.dataset.messageId = message.id;
      const time = pendingBubble.querySelector('time');
      const date = new Date(message.createdAt);
      if (time && !Number.isNaN(date.getTime())) time.textContent = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      updateMessageStatus(message);
    } else {
      appendMessage(box, message);
    }
    updateChatPreview(chatId, text);
  } catch (error) {
    const bubble = document.querySelector(`[data-message-id="${pendingId}"]`);
    if (bubble) {
      bubble.classList.add('failed');
      bubble.querySelector('[data-message-status]')?.setAttribute('aria-label', 'Pesan gagal terkirim');
    }
    input.value = text;
    showToast(error.message || 'Pesan belum terkirim.', 'error');
  } finally {
    button.disabled = false;
    input.focus();
  }
}

function messageMarkup(message, time, statusOverride = '') {
  return `<article class="ch-bubble${message.senderId === currentUserId ? ' mine' : ''}" data-message-id="${escapeHtml(message.id)}"><p data-no-translate>${escapeHtml(message.text)}</p><time>${escapeHtml(time)}</time>${message.senderId === currentUserId ? statusMarkup(message, statusOverride) : ''}</article>`;
}

function appendMessage(box, message, statusOverride) {
  if (!box || box.querySelector(`[data-message-id="${CSS.escape(String(message.id))}"]`)) return;
  const date = new Date(message.createdAt);
  const time = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  box.insertAdjacentHTML('beforeend', messageMarkup(message, time, statusOverride));
}

function statusMarkup(message, override = '') {
  const state = override || (message.readAt ? 'read' : message.deliveredAt ? 'delivered' : 'sent');
  const icon = state === 'pending' ? '◷' : state === 'read' || state === 'delivered' ? '✓✓' : '✓';
  const label = { pending: 'Menunggu terkirim', sent: 'Terkirim ke server', delivered: 'Terkirim ke penerima', read: 'Sudah dibaca' }[state];
  return `<span class="ch-message-status ${state}" data-message-status aria-label="${label}" title="${label}">${icon}</span>`;
}

function updateMessageStatus(message) {
  if (!message?.id) return;
  const bubble = document.querySelector(`[data-message-id="${CSS.escape(String(message.id))}"]`);
  if (!bubble) return;
  bubble.querySelector('[data-message-status]')?.remove();
  bubble.insertAdjacentHTML('beforeend', statusMarkup(message));
  saveCachedMessage(selectedChatId, { id: message.id, deliveredAt: message.deliveredAt, readAt: message.readAt });
}

function updateChatPreview(chatId, text) {
  const item = document.querySelector(`[data-chat-select="${CSS.escape(chatId)}"] .ch-chat-copy small`);
  if (item) item.textContent = text;
}

function injectStyles() {
  if (document.getElementById('chat-page-style')) return;
  const style = document.createElement('style');
  style.id = 'chat-page-style';
  style.textContent =
    '.ch-page{max-width:1100px;margin:0 auto}.ch-heading{margin-bottom:22px}.ch-kicker{margin:0 0 7px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}.ch-heading h1{margin:0;color:var(--fi-deep);font-size:clamp(29px,4vw,38px);letter-spacing:-.04em}.ch-heading p:not(.ch-kicker){margin:8px 0 0;color:var(--fi-muted);font-size:14px}.ch-layout{min-height:570px;display:grid;grid-template-columns:minmax(235px,310px) minmax(0,1fr);overflow:hidden}.ch-inbox{border-right:1px solid var(--fi-line);background:#e5f0ef}.ch-chat-item{width:100%;min-height:76px;padding:12px;border:0;border-bottom:1px solid #cbdedc;display:flex;align-items:center;gap:11px;background:transparent;text-align:left;cursor:pointer}.ch-chat-item:hover,.ch-chat-item.active{background:#f6fbfa}.ch-avatar{width:39px;height:39px;flex:none;border-radius:50%;display:grid;place-items:center;background:#cfe7e4;color:#163832;font-size:14px;font-weight:700}.ch-chat-copy{min-width:0;display:grid;gap:5px}.ch-chat-copy strong{overflow:hidden;color:#163832;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.ch-chat-copy small{overflow:hidden;color:#708582;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.ch-conversation{min-width:0;display:flex;flex-direction:column;background:#f8fbfa}.ch-person{min-height:69px;padding:12px 17px;border-bottom:1px solid #DAF1DE;display:flex;align-items:center;gap:11px}.ch-person div{display:grid;gap:4px}.ch-person strong{color:#163832;font-size:13px}.ch-person small{color:#829592;font-size:10px}.ch-messages{flex:1;min-height:375px;max-height:500px;padding:19px;overflow-y:auto;display:flex;flex-direction:column;align-items:flex-start;gap:10px}.ch-bubble{position:relative;max-width:min(78%,520px);padding:11px 13px;border-radius:15px 15px 15px 4px;background:#e5efee;color:#244b49}.ch-bubble.mine{align-self:flex-end;padding-right:43px;border-radius:15px 15px 4px 15px;background:#163832;color:#f3fbfa}.ch-bubble.failed{outline:1px solid #d8756b}.ch-bubble p{margin:0;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.ch-bubble time{display:block;margin-top:5px;font-size:9px;opacity:.68;text-align:right}.ch-message-status{position:absolute;right:11px;bottom:10px;font-size:12px;line-height:1;letter-spacing:-3px}.ch-message-status.pending,.ch-message-status.sent{opacity:.72}.ch-message-status.delivered{opacity:.85}.ch-message-status.read{color:#75d9fa}.ch-message-status.failed{color:#ffd1c9}.ch-compose{padding:13px;border-top:1px solid #DAF1DE;display:flex;gap:9px;background:#fff}.ch-compose input{min-width:0;flex:1;height:43px;padding:0 14px;border:1px solid #d1e1df;border-radius:999px;outline:none;font:400 12px Inter,Arial,sans-serif}.ch-compose input:focus{border-color:#4d9d98;box-shadow:0 0 0 3px #23534715}.ch-compose .fi-button{min-height:43px}.ch-empty,.ch-state{padding:24px;color:#718582;font-size:12px;line-height:1.7;text-align:center}.ch-empty{margin:auto}.ch-state{min-height:250px;border:1px solid var(--fi-line);border-radius:22px;display:grid;place-content:center;gap:10px;background:var(--fi-card)}.ch-state h1{color:var(--fi-deep)}.ch-state .fi-button{justify-self:center}.ch-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center}.ch-welcome>span{width:50px;height:50px;border-radius:17px;display:grid;place-items:center;background:#d8eeeb;color:#235347;font-size:24px}.ch-welcome h2{margin:15px 0 4px;color:#163832;font-size:20px}.ch-welcome p{max-width:350px;color:#718582;font-size:12px;line-height:1.7}.ch-welcome .fi-button{margin-top:8px}@media(max-width:700px){.ch-layout{grid-template-columns:1fr;min-height:0}.ch-inbox{max-height:210px;border-right:0;border-bottom:1px solid var(--fi-line);overflow:auto}.ch-chat-item{min-height:62px}.ch-messages{min-height:280px;max-height:48vh;padding:13px}.ch-conversation{min-height:420px}.ch-compose{padding:10px}.ch-compose .fi-button{padding:0 15px}}';
  style.textContent += `.ch-page{max-width:1180px}.ch-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px}.ch-kicker{color:#235347}.ch-heading h1{color:#051F20;font-size:clamp(30px,4vw,40px)}.ch-heading p:not(.ch-kicker){color:#66776b}.ch-layout{min-height:min(70vh,720px);grid-template-columns:minmax(260px,320px) minmax(0,1fr);border:1px solid #d5e4d9;border-radius:24px;background:#fff;box-shadow:0 22px 60px #051F2010}.ch-inbox{min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid #dce9df;background:linear-gradient(180deg,#f2f8f3,#edf5ef)}.ch-inbox-head{padding:20px 18px 14px;display:flex;align-items:center;justify-content:space-between}.ch-inbox-head>div{display:grid;gap:4px}.ch-inbox-head strong{color:#0B2B26;font-size:14px}.ch-inbox-head small{color:#7c8c80;font-size:10px}.ch-inbox-head>span{min-width:25px;height:25px;padding:0 7px;border-radius:999px;display:grid;place-items:center;background:#DAF1DE;color:#163832;font-size:10px;font-weight:700}.ch-search{height:40px;margin:0 13px 12px;padding:0 11px;border:1px solid #dce8df;border-radius:12px;display:flex;align-items:center;gap:8px;background:#fff;color:#678171}.ch-search>span{font-size:20px;line-height:1}.ch-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#0B2B26;font:400 11px Inter,Arial,sans-serif}.ch-search:focus-within{border-color:#7eae8a;box-shadow:0 0 0 3px #8EB69B33}.ch-chat-list{min-height:0;flex:1;overflow-y:auto;padding:0 8px 10px}.ch-chat-item{position:relative;width:100%;min-height:72px;margin:3px 0;padding:11px 10px;border:1px solid transparent;border-radius:14px;gap:11px;transition:background .18s ease,border-color .18s ease,transform .18s ease}.ch-chat-item:hover{transform:translateX(2px);background:#f9fcf9}.ch-chat-item.active{border-color:#d5e7d8;background:#fff;box-shadow:0 5px 16px #0B2B260c}.ch-chat-item[hidden]{display:none}.ch-avatar{width:42px;height:42px;background:linear-gradient(145deg,#DAF1DE,#cae6d1);color:#163832;font-size:13px}.ch-chat-copy{gap:6px}.ch-chat-copy strong{color:#0B2B26;font-size:12px}.ch-chat-copy small{color:#75867a;font-size:10px}.ch-inbox-empty{min-height:200px;padding:24px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.ch-inbox-empty>span{width:44px;height:44px;margin-bottom:12px;border:1px solid #d5e7d8;border-radius:15px;display:grid;place-items:center;background:#e7f3e9;color:#235347;font-size:19px}.ch-inbox-empty strong{color:#234733;font-size:12px}.ch-inbox-empty p{max-width:210px;margin:7px 0 0;color:#75867a;font-size:10px;line-height:1.65}.ch-conversation{background-color:#fbfdfb;background-image:radial-gradient(#d5e5d8 0.7px,transparent .7px);background-size:18px 18px}.ch-person{min-height:76px;padding:13px 20px;border-bottom:1px solid #e1ebe3;background:rgba(255,255,255,.93)}.ch-person .ch-avatar{width:43px;height:43px}.ch-person div{gap:5px}.ch-person strong{color:#0B2B26;font-size:13px}.ch-person small{color:#77887b;font-size:10px}.ch-messages{min-height:390px;max-height:none;padding:24px;gap:12px}.ch-bubble{padding:12px 15px;border:1px solid #e0e9e1;border-radius:17px 17px 17px 5px;background:#fff;color:#294c35;box-shadow:0 4px 12px #183b2508}.ch-bubble.mine{border-color:#163832;border-radius:17px 17px 5px 17px;background:linear-gradient(135deg,#163832,#286a43);color:#f5fff7;box-shadow:0 6px 16px #16383222}.ch-bubble p{font-size:12px;line-height:1.65}.ch-message-status.read{color:#8EB69B}.ch-compose{padding:14px 16px;border-top:1px solid #e1ebe3;background:rgba(255,255,255,.96)}.ch-compose input{height:46px;padding:0 15px;border-color:#d8e5da;border-radius:13px;background:#f8fbf8;font-size:12px}.ch-compose input:focus{border-color:#65a578;box-shadow:0 0 0 3px #8EB69B33}.ch-compose .fi-button{min-height:46px;padding:0 19px;border-radius:13px;background:#163832}.ch-empty{max-width:300px;padding:18px;border:1px solid #e1ebe3;border-radius:16px;background:#fff;color:#697b6d;box-shadow:0 8px 24px #0B2B2608}.ch-welcome{min-height:450px;background:radial-gradient(ellipse at center,#eef7ef 0,transparent 65%)}.ch-welcome>span{width:58px;height:58px;border:1px solid #d4e8d7;border-radius:19px;background:#e2f1e5;color:#163832;box-shadow:0 8px 24px #16383214}.ch-welcome h2{color:#0B2B26;font-size:21px}.ch-welcome p{color:#6b7c70;font-size:12px}.ch-state{border-color:#d5e4d9;background:#f7fbf7}.ch-state h1{color:#051F20}@media(max-width:700px){.ch-layout{min-height:0;border-radius:19px}.ch-inbox{max-height:310px;border-right:0;border-bottom:1px solid #dce9df}.ch-inbox-head{padding:15px 14px 11px}.ch-chat-list{max-height:205px}.ch-chat-item{min-height:62px}.ch-messages{min-height:280px;max-height:52vh;padding:15px}.ch-conversation{min-height:430px}.ch-welcome{min-height:340px;padding:24px}.ch-compose{padding:10px}.ch-compose .fi-button{padding:0 15px}}
`;
  style.textContent += `.ch-heading{position:relative;isolation:isolate;min-height:150px;box-sizing:border-box;display:flex;align-items:center;overflow:hidden;margin-bottom:24px;padding:26px 31px;border:1px solid #cfe1d2;border-radius:24px;background:radial-gradient(ellipse at 88% 20%,#d9eee0 0,transparent 32%),linear-gradient(115deg,#f8fbf7,#edf5ef 65%,#e4f1e8);box-shadow:0 12px 30px #174e320c}.ch-heading:after{position:absolute;z-index:-1;right:-45px;top:-155px;width:340px;height:340px;border:1px solid #a8cdb544;border-radius:50%;content:''}.ch-heading>div{position:relative;z-index:1}.ch-kicker{display:inline-flex;margin:0 0 10px;padding:6px 10px;border:1px solid #cfe1d2;border-radius:999px;background:#ffffffa8;color:#557b61;font-size:9px}.ch-heading h1{color:#104b3e}.ch-heading p:not(.ch-kicker){color:#607369;line-height:1.6}@media(max-width:700px){.ch-heading{min-height:0;padding:22px 20px;border-radius:20px}.ch-heading:after{right:-210px;top:-185px}}`;
  style.textContent += `.ch-page{max-width:1260px;margin-inline:auto}`;
  document.head.append(style);
}
