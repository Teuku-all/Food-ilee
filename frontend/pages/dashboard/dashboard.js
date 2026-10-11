import { getCurrentUser } from "../../services/user.js";
import { removeToken } from "../../utils/storage.js";
import { renderTambahLimbah } from "../tambah-limbah/tambah-limbah.js";
import { getWastes, deleteWaste, updateWaste } from "../../services/waste.js";
import { showToast, injectToastStyle } from "../../utils/toast.js";
import { showLoading, hideLoading, injectLoadingStyle } from "../../utils/loading.js";
import { toggleTheme, getTheme } from '../../utils/theme.js';
import { getAIRecommendation } from '../../services/ai.js';
import { askAI } from '../../services/ai.js';
import { escapeHtml } from '../../utils/html.js';

let searchValue = "";
let currentPage = 1;
let wasteChartInstance = null;
const aiCache = {};
const ITEMS_PER_PAGE = 4;

export async function renderDashboard() {
  const app = document.getElementById("app");
  const result = await getCurrentUser();

  // token invalid
  if (!result.success) {
    removeToken();

    location.reload();

    return;
  }

  const user = result.data;

  // get wastes
  const wasteResult = await getWastes({ mine: true });

  const wastes = wasteResult.data || [];

  const filteredWastes = wastes.filter((waste) => {
    return (
      waste.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      waste.description.toLowerCase().includes(searchValue.toLowerCase())
    );
  });

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedWastes = filteredWastes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredWastes.length / ITEMS_PER_PAGE);
  let wasteCards = '';
  if (wastes.length > 0) {

  const cards =
    await Promise.all(

      paginatedWastes.map(
        async (waste) => {

          if (!aiCache[waste.id]) {

            const aiResult =
              await getAIRecommendation(

                waste.title,

                waste.description
              );

            aiCache[waste.id] =

              aiResult.success

                ? aiResult.data

                : {

                    category:
                      'Unknown',

                    recommendation:
                      'AI gagal menganalisa.',

                    danger_level:
                      '-',

                    recycle_tip:
                      '-'
                  };
          }

          const ai =
            aiCache[waste.id];

          return `

            <div class="waste-card">

              <img
                src="${escapeHtml(waste.image)}"
              />

              <div class="waste-content">

                <h3>
                  ${escapeHtml(waste.title)}
                </h3>

                <p>
                  ${escapeHtml(waste.description)}
                </p>

                <div class="ai-box">

                  <p class="ai-category">

                    Kategori:
                    ${escapeHtml(ai.category)}

                  </p>

                  <p class="ai-recommendation">

                    ${escapeHtml(ai.recommendation)}

                  </p>

                  <p class="ai-recommendation">

                    Tingkat Bahaya:
                    ${escapeHtml(ai.danger_level)}

                  </p>

                  <p class="ai-recommendation">

                    Tips Daur Ulang:
                    ${escapeHtml(ai.recycle_tip)}

                  </p>

                </div>

                <button
                  class="edit-btn"
                  data-id="${waste.id}"
                  data-title="${escapeHtml(waste.title)}"
                  data-description="${escapeHtml(waste.description)}"
                >
                  Edit
                </button>

                <button
                  class="delete-btn"
                  data-id="${waste.id}"
                >
                  Hapus
                </button>

              </div>

            </div>
          `;
        }
      )
    );

  wasteCards =
    cards.join('');
}

  app.innerHTML = `

  <main class="dashboard-layout">

    <aside class="sidebar">

      <div class="sidebar-top">

        <h1 class="logo">
          Food Ilee
        </h1>

        <p class="sidebar-user">
          ${escapeHtml(user.email)}
        </p>

      </div>

      <nav class="sidebar-menu">

        <button class="menu-item active">
          Dashboard
        </button>

        <button class="menu-item add-btn">
          Tambah Limbah
        </button>

        <a href="#marketplace">

          <button class="menu-item">

            Marketplace

          </button>

        </a>

        <button class="menu-item export-btn">
          Export PDF
        </button>

        <button class="menu-item theme-btn">
          ${
            getTheme() === 'dark'
            ? '☀️ Light Mode'
            : '🌙 Dark Mode'
          }
        </button>

        <button class="menu-item logout-btn">
          Logout
        </button>

      </nav>

    </aside>

    <section class="dashboard-content">

      <div class="topbar">

        <div>
          <h1 class="title">
            Dashboard
          </h1>

          <p class="welcome">
            Kelola limbah makanan dengan mudah
          </p>

          <div class="search-box">

            <input
              type="text"
              class="search-input"
              placeholder="Cari limbah..."
              value="${escapeHtml(searchValue)}"
            />

          </div>
        </div>
      </div>

      <div class="card-grid">

        <div class="dashboard-card">
          <h2>Total Limbah</h2>
          <p>${wastes.length}</p>
        </div>

        <div class="dashboard-card">
          <h2>Total Edukasi</h2>
          <p>25</p>
        </div>

        <div class="dashboard-card">
          <h2>Notifikasi</h2>
          <p>5</p>
        </div>
        <div class="dashboard-card">

          <h2>
            AI Detection
          </h2>

          <p>
            ${wastes.length}
          </p>

        </div>

      </div>

      <div class="chart-section">

  <div class="chart-card">

    <h2>
      Statistik Limbah
    </h2>

    <canvas id="wasteChart"></canvas>

  </div>

</div>

      <div class="history-section">

        <h2>Riwayat Limbah</h2>

        <div class="waste-list">

          ${
            wastes.length === 0
              ? `

              <p>
                Belum ada limbah
              </p>

            `
              : wasteCards
          }

        </div>

        <div class="pagination">

  <button
    class="prev-page"
    ${currentPage === 1 ? "disabled" : ""}
  >
    Prev
  </button>

  <span>
    Page ${currentPage}
    of ${totalPages || 1}
  </span>

  <button
    class="next-page"
    ${currentPage >= totalPages ? "disabled" : ""}
  >
    Next
  </button>

</div>

      </div>

    </section>

    <button class="chatbot-toggle">
  💬
</button>

<div class="chatbot hidden">

  <div class="chatbot-header">

    <h3>
      AI Assistant
    </h3>

  </div>

  <div class="chat-messages">

    <div class="bot-message">

      Halo 👋
      Ada yang bisa saya bantu?

    </div>

  </div>

  <form class="chat-form">

    <input
      type="text"
      class="chat-input"
      placeholder="Tanya AI..."
    />

    <button>
      Kirim
    </button>

  </form>

</div>

  </main>
`;

  setupLogout();
  setupAddButton();
  setupDeleteButtons();
  setupEditButtons();
  setupSearch();
  setupPagination();
  setupChart(wastes);
  setupThemeButton();
  setupChatbot();
  injectDashboardStyle();
  injectToastStyle();
  injectLoadingStyle();
  setupExportButton(wastes);
}

function setupLogout() {
  const button = document.querySelector(".logout-btn");

  button.addEventListener("click", () => {
    removeToken();

    alert("Logout berhasil");

    location.reload();
  });
}

function setupAddButton() {
  const button = document.querySelector(".add-btn");

  button.addEventListener("click", () => {
    renderTambahLimbah();
  });
}

function setupDeleteButtons() {
  const buttons = document.querySelectorAll(".delete-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      const confirmDelete = confirm("Yakin ingin menghapus?");

      if (!confirmDelete) return;

      showLoading();

      const result = await deleteWaste(id);

      hideLoading();

      if (!result.success) {
        alert(result.message);

        return;
      }

      showToast("Limbah berhasil dihapus");

      renderDashboard();
    });
  });
}

function setupEditButtons() {
  const buttons = document.querySelectorAll(".edit-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;

      const oldTitle = button.dataset.title;

      const oldDescription = button.dataset.description;

      const title = prompt("Edit title", oldTitle);

      if (!title) return;

      const description = prompt("Edit description", oldDescription);

      if (!description) return;

      const formData = new FormData();

      formData.append("title", title);

      formData.append("description", description);

      showLoading();

      const result = await updateWaste(id, formData);
      hideLoading();

      if (!result.success) {
        alert(result.message);

        return;
      }

      showToast("Limbah berhasil diupdate");

      renderDashboard();
    });
  });
}

function setupSearch() {
  const input = document.querySelector(".search-input");

  if (!input) return;

  input.focus();

  // pindahkan cursor ke akhir
  const length = input.value.length;

  input.setSelectionRange(length, length);

  input.addEventListener("input", (e) => {
    searchValue = e.target.value;

    renderDashboard();
  });
}

function setupPagination() {
  const prev = document.querySelector(".prev-page");

  const next = document.querySelector(".next-page");

  if (prev) {
    prev.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;

        renderDashboard();
      }
    });
  }

  if (next) {
    next.addEventListener("click", () => {
      currentPage++;

      renderDashboard();
    });
  }
}

function setupThemeButton() {

  const button =
    document.querySelector(
      '.theme-btn'
    );

  if (!button) return;

  button.addEventListener(
    'click',
    () => {

      toggleTheme();

      renderDashboard();
    }
  );
}

function setupChart(wastes) {

  const canvas =
    document.getElementById(
      'wasteChart'
    );

  if (!canvas) return;

  const ctx =
    canvas.getContext('2d');

  const totalWaste =
    wastes.length;

  const education =
    25;

  const notifications =
    5;

  if (wasteChartInstance) {

  wasteChartInstance.destroy();
}

wasteChartInstance =
  new Chart(ctx, {

    type: 'bar',

    data: {

      labels: [
        'Limbah',
        'Edukasi',
        'Notifikasi'
      ],

      datasets: [
        {
          label: 'Dashboard Analytics',

          data: [
            totalWaste,
            education,
            notifications
          ],

          borderWidth: 2,

          borderRadius: 12
        }
      ]
    },

    options: {

      

      responsive: true,

      plugins: {

        legend: {
          display: false
        }
      },

      scales: {

  y: {

    ticks: {
      color: '#94a3b8'
    }
  },

  x: {

    ticks: {
      color: '#94a3b8'
    }
  }
}

    }
  });
}

function setupExportButton(wastes) {

  const button =
    document.querySelector(
      '.export-btn'
    );

  if (!button) return;

  button.addEventListener(
    'click',
    () => {

      generatePDF(wastes);
    }
  );
}

function generatePDF(wastes) {

  showLoading();
  const doc = new window.jspdf.jsPDF();

  doc.setFontSize(22);

  doc.text(
    'Food Ilee Report',
    20,
    20
  );

  

  doc.setFontSize(12);

  doc.text(
    `Tanggal: ${new Date().toLocaleDateString()}`,
    20,
    30
  );

  doc.text(
  `Total Limbah: ${wastes.length}`,
  20,
  40
  );

  let y = 50;

  wastes.forEach((waste, index) => {

    doc.setFontSize(14);

    doc.text(
      `${index + 1}. ${waste.title}`,
      20,
      y
    );

    y += 8;

    doc.setFontSize(11);

    doc.text(
      waste.description,
      25,
      y
    );

    y += 15;

    // auto page break
    if (y > 270) {

      doc.addPage();

      y = 20;
    }
  });

  hideLoading();
  doc.save(
    'foodilee-report.pdf'
  );

  showToast(
    'PDF berhasil didownload'
  );
}

function setupChatbot() {
  const toggle =
    document.querySelector(
      '.chatbot-toggle'
    );

  const chatbot =
    document.querySelector(
      '.chatbot'
    );

  const form =
    document.querySelector(
      '.chat-form'
    );

  const input =
    document.querySelector(
      '.chat-input'
    );

  const messages =
    document.querySelector(
      '.chat-messages'
    );

  toggle.addEventListener(
    'click',
    () => {

      chatbot.classList.toggle(
        'hidden'
      );
    }
  );

  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      const text =
        input.value.trim();

      if (!text) return;

      messages.innerHTML += `

        <div class="user-message">
          ${escapeHtml(text)}
        </div>
      `;

      input.value = '';

      messages.innerHTML += `

        <div class="bot-message typing">
          AI sedang mengetik...
        </div>
      `;

      messages.scrollTop =
        messages.scrollHeight;

      const result =
        await askAI(text);

      document
        .querySelector('.typing')
        ?.remove();

      messages.innerHTML += `

        <div class="bot-message">
          ${escapeHtml(result.data)}
        </div>
      `;

      messages.scrollTop =
        messages.scrollHeight;
    }
  );
}

function injectDashboardStyle() {
  if (document.getElementById("dashboard-style")) return;

  const style = document.createElement("style");

  style.id = "dashboard-style";

  style.innerHTML = `

    .dashboard-layout {

      min-height: 100vh;

      display: grid;

      grid-template-columns: 280px 1fr;

      background: var(--bg-primary);
    }

    .sidebar {

      background:
      rgba(255,255,255,0.7);

      backdrop-filter: blur(12px);

      border-right:
        1px solid rgba(255,255,255,0.2);

      padding: 24px;

      display: flex;

      flex-direction: column;

      justify-content: space-between;
    }

.sidebar-top {
  margin-bottom: 40px;
}

.logo {

  font-size: 28px;

  font-weight: 800;

  color: var(--green);
}

.sidebar-user {

  margin-top: 10px;

  color: var(--gray);

  word-break: break-word;
}

.sidebar-menu {

  display: flex;

  flex-direction: column;

  gap: 12px;
}

.menu-item {

  padding: 14px 18px;

  border-radius: 14px;

  background: var(--bg-card);
  color: var(--text-primary);


  font-weight: 700;

  transition: 0.2s;
}

.menu-item:hover {
  transform: translateY(-2px);
}

.menu-item.active {

  background: var(--green);

  color: white;
}

.dashboard-content {

  padding: 32px;
}

.topbar {

  margin-bottom: 30px;
}

.title {

  font-size: 36px;
  color: var(--text-primary);
  font-weight: 800;
}

.welcome {

  margin-top: 8px;

  color: var(--text-secondary);
}

.card-grid {

  display: grid;

  grid-template-columns:
    repeat(auto-fit, minmax(240px, 1fr));

  gap: 20px;
}

.dashboard-card {

  background:
    rgba(255,255,255,0.8);

  backdrop-filter: blur(12px);

  border-radius: 24px;

  padding: 28px;
  color: var(--text-primary);

  border:
    1px solid rgba(255,255,255,0.3);

  box-shadow:
    0 10px 30px rgba(0,0,0,0.05);
}

.dashboard-card h2 {

  margin-bottom: 16px;
}

.dashboard-card p {

  font-size: 34px;

  font-weight: 800;

  color: var(--green);
}

.history-section {
  margin-top: 40px;
}

.history-section h2 {
  margin-bottom: 20px;
}

.waste-list {

  display: grid;

  grid-template-columns:
    repeat(auto-fit, minmax(300px, 1fr));

  gap: 24px;
}

.waste-card {

  background: var(--bg-card);

  border-radius: 24px;

  overflow: hidden;

  box-shadow:
    0 10px 30px rgba(0,0,0,0.06);
}

.waste-card img {

  width: 100%;

  height: 220px;

  object-fit: cover;
}

.waste-content {
  padding: 20px;
  color: var(--text-primary);
}

.waste-content h3 {
  margin-bottom: 10px;
}

.edit-btn,
.delete-btn {

  margin-top: 16px;

  padding: 10px 16px;

  border-radius: 12px;

  color: white;

  font-weight: 700;
}

.edit-btn {

  background: var(--green);

  margin-right: 10px;
}

.delete-btn {
  background: var(--danger);
}



.search-box {
  margin-top: 20px;
}

.search-input {

  width: 100%;

  max-width: 400px;

  padding: 14px 18px;

  border-radius: 14px;

  border: 1px solid var(--border);

  background: var(--bg-card);

  font-size: 15px;
}

.pagination {

  margin-top: 30px;

  display: flex;

  justify-content: center;

  align-items: center;

  gap: 20px;
}

.pagination button {

  padding: 10px 16px;

  border-radius: 12px;

  background: var(--green);

  color: white;

  font-weight: 700;
}

.pagination button:disabled {

  opacity: 0.5;

  cursor: not-allowed;
}

@media (max-width: 768px) {

  .dashboard-layout {

    grid-template-columns: 1fr;
  }

  .sidebar {

    border-right: none;

    border-bottom:
      1px solid rgba(255,255,255,0.2);
  }

  .dashboard-content {
    padding: 20px;
  }

  .title {
    font-size: 28px;
  }
}

body.light-theme {

  --bg-primary:
    #f8fafc;

  --bg-card:
    rgba(255,255,255,0.8);

  --text-primary:
    #0f172a;

  --text-secondary:
    #64748b;
}

body.dark-theme {

  --bg-primary:
    #0f172a;

  --bg-card:
    rgba(15,23,42,0.7);

  --text-primary:
    #f8fafc;

  --text-secondary:
    #94a3b8;
}

body,
.dashboard-card,
.sidebar,
.waste-card,
.menu-item {

  transition:
    0.3s ease;
}

.chart-section {
  margin-top: 40px;
}

.chart-card {

  background:
    var(--bg-card);

  border-radius: 24px;

  padding: 24px;

  box-shadow:
    0 10px 30px rgba(0,0,0,0.05);
}

.chart-card h2 {
  margin-bottom: 20px;
}

.ai-box {

  margin-top: 16px;

  padding: 14px;

  border-radius: 14px;

  background:
    rgba(34,197,94,0.1);

  border:
    1px solid rgba(34,197,94,0.2);
}

.ai-category {

  font-weight: 700;

  color: #22c55e;

  margin-bottom: 8px;
}

.ai-recommendation {

  font-size: 14px;

  color:
    var(--text-secondary);
}

.chatbot-toggle {

  position: fixed;

  right: 30px;

  bottom: 30px;

  width: 70px;

  height: 70px;

  border-radius: 50%;

  background: var(--green);

  color: white;

  font-size: 28px;

  box-shadow:
    0 10px 30px rgba(0,0,0,0.2);

  z-index: 999;
}

.chatbot {

  position: fixed;

  right: 30px;

  bottom: 120px;

  width: 380px;

  height: 550px;

  background:
    var(--bg-card);

  border-radius: 24px;

  overflow: hidden;

  display: flex;

  flex-direction: column;

  box-shadow:
    0 10px 40px rgba(0,0,0,0.2);

  z-index: 999;
}

.hidden {
  display: none;
}

.chatbot-header {

  padding: 20px;

  background: var(--green);

  color: white;

  font-weight: 700;
}

.chat-messages {

  flex: 1;

  overflow-y: auto;

  padding: 20px;

  display: flex;

  flex-direction: column;

  gap: 14px;
}

.user-message {

  align-self: flex-end;

  background: var(--green);

  color: white;

  padding: 12px 16px;

  border-radius: 16px;
}

.bot-message {

  align-self: flex-start;

  background: #e2e8f0;

  padding: 12px 16px;

  border-radius: 16px;

  max-width: 85%;
}

.chat-form {

  display: flex;

  border-top:
    1px solid var(--border);
}

.chat-input {

  flex: 1;

  padding: 16px;

  border: none;

  background: transparent;
}

.chat-form button {

  padding: 0 20px;

  background: var(--green);

  color: white;
}

  `;

  document.head.appendChild(style);
}
