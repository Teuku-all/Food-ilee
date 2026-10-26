import { loadStylesheet } from '../../utils/stylesheet.js';
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
  renderShell('chat', chatLoadingSkeleton());
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
    `<section class="ch-page"><div class="ch-layout fi-card${selected ? ' ch-has-selection' : ''}"><aside class="ch-inbox" aria-label="Daftar percakapan"><header class="ch-inbox-head"><div><strong>Percakapan</strong><small>Ruang koordinasi Anda</small></div><span>${chats.length}</span></header><label class="ch-search"><span aria-hidden="true">${icon('search')}</span><input type="search" data-chat-search placeholder="Cari percakapan" aria-label="Cari percakapan"></label><div class="ch-chat-list">${chats.length ? chats.map(chatItem).join('') : `<div class="ch-inbox-empty"><span aria-hidden="true">${icon('chat')}</span><strong>Mulai percakapan</strong><p>Hubungi penjual langsung dari detail produk yang menarik bagi Anda.</p></div>`}</div></aside><section class="ch-conversation" aria-label="Isi percakapan">${selected ? `<header class="ch-person"><button class="ch-mobile-back" type="button" data-chat-back aria-label="Kembali ke daftar percakapan">${icon('arrow')}</button><span class="ch-avatar">${escapeHtml(initials(otherUser(selected)))}</span><div><strong>${escapeHtml(displayName(otherUser(selected)))}</strong><small>Diskusi transaksi Food Ilee</small></div></header><div class="ch-messages" data-chat-messages role="log" aria-label="Riwayat pesan" aria-live="polite" aria-relevant="additions"><div class="ch-empty">Memuat pesan…</div></div><form class="ch-compose"><input name="text" maxlength="4000" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan"><button class="fi-button" type="submit">Kirim</button></form>` : `<div class="ch-welcome"><span>${icon('sparkles')}</span><h2>Percakapan Anda</h2><p>Pilih percakapan untuk melihat pesan, atau mulai chat melalui detail produk.</p><a class="fi-button" href="#marketplace">Buka marketplace</a></div>`}</section></div></section>`,
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
  if (chatId === selectedChatId) {
    document.querySelector('.ch-layout')?.classList.remove('ch-show-inbox');
    return;
  }
  selectedChatId = chatId;
  sessionStorage.setItem('foodilee_chat_id', chatId);
  document.querySelector('.ch-layout')?.classList.remove('ch-show-inbox');
  document.querySelector('.ch-layout')?.classList.add('ch-has-selection');
  document.querySelectorAll('[data-chat-select]').forEach((button) => {
    button.classList.toggle('active', button.dataset.chatSelect === chatId);
  });
  renderConversation(chatId, revision);
}

function renderConversation(chatId, revision) {
  const selected = chats.find((chat) => chat.id === chatId);
  const pane = document.querySelector('.ch-conversation');
  if (!pane || !selected) return;
  pane.innerHTML = `<header class="ch-person"><button class="ch-mobile-back" type="button" data-chat-back aria-label="Kembali ke daftar percakapan">${icon('arrow')}</button><span class="ch-avatar">${escapeHtml(initials(otherUser(selected)))}</span><div><strong>${escapeHtml(displayName(otherUser(selected)))}</strong><small>Diskusi transaksi Food Ilee</small></div></header><div class="ch-messages" data-chat-messages role="log" aria-label="Riwayat pesan" aria-live="polite" aria-relevant="additions"><div class="ch-empty">Memuat pesan…</div></div><form class="ch-compose"><input name="text" maxlength="4000" autocomplete="off" placeholder="Tulis pesan…" aria-label="Tulis pesan"><button class="fi-button" type="submit">Kirim</button></form>`;
  pane.querySelector('[data-chat-back]')?.addEventListener('click', () => {
    document.querySelector('.ch-layout')?.classList.add('ch-show-inbox');
    document.querySelector(`[data-chat-select="${CSS.escape(chatId)}"]`)?.focus();
  });
  loadConversation(chatId, revision);
  bindLiveChat(chatId, revision);
  pane
    .querySelector('.ch-compose')
    ?.addEventListener('submit', (event) => submitMessage(event, chatId, revision));
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
        const existed = Boolean(
          box.querySelector(`[data-message-id="${CSS.escape(String(message.id))}"]`),
        );
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
    ? messages
        .map((message) => {
          const date = new Date(message.createdAt);
          const time = Number.isNaN(date.getTime())
            ? ''
            : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          return messageMarkup(message, time);
        })
        .join('')
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
  const pendingMessage = {
    id: pendingId,
    text,
    senderId: currentUserId,
    createdAt: new Date().toISOString(),
  };
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
      if (time && !Number.isNaN(date.getTime()))
        time.textContent = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      updateMessageStatus(message);
    } else {
      appendMessage(box, message);
    }
    updateChatPreview(chatId, text);
  } catch (error) {
    const bubble = document.querySelector(`[data-message-id="${pendingId}"]`);
    if (bubble) {
      bubble.classList.add('failed');
      bubble
        .querySelector('[data-message-status]')
        ?.setAttribute('aria-label', 'Pesan gagal terkirim');
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
  const time = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  box.insertAdjacentHTML('beforeend', messageMarkup(message, time, statusOverride));
}

function statusMarkup(message, override = '') {
  const state = override || (message.readAt ? 'read' : message.deliveredAt ? 'delivered' : 'sent');
  const icon = state === 'pending' ? '◷' : state === 'read' || state === 'delivered' ? '✓✓' : '✓';
  const label = {
    pending: 'Menunggu terkirim',
    sent: 'Terkirim ke server',
    delivered: 'Terkirim ke penerima',
    read: 'Sudah dibaca',
  }[state];
  return `<span class="ch-message-status ${state}" data-message-status aria-label="${label}" title="${label}">${icon}</span>`;
}

function updateMessageStatus(message) {
  if (!message?.id) return;
  const bubble = document.querySelector(`[data-message-id="${CSS.escape(String(message.id))}"]`);
  if (!bubble) return;
  bubble.querySelector('[data-message-status]')?.remove();
  bubble.insertAdjacentHTML('beforeend', statusMarkup(message));
  saveCachedMessage(selectedChatId, {
    id: message.id,
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
  });
}

function updateChatPreview(chatId, text) {
  const item = document.querySelector(
    `[data-chat-select="${CSS.escape(chatId)}"] .ch-chat-copy small`,
  );
  if (item) item.textContent = text;
}

function injectStyles() {
  loadStylesheet('chat-page-style', new URL('../../styles/pages/chat.css', import.meta.url));
}
