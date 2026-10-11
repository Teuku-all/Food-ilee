import { createWaste } from "../../services/waste.js";

export function renderTambahLimbah() {
  const app = document.getElementById("app");

  app.innerHTML = `

    <main class="container">

      <div class="topbar">

        <h1>Tambah Limbah</h1>

        <button class="back-btn">
          Kembali
        </button>

      </div>

      <form class="waste-form">

        <input
          type="text"
          id="title"
          placeholder="Judul limbah"
          required
        />

        <textarea
          id="description"
          placeholder="Deskripsi limbah"
          required
        ></textarea>

        <input type="number" id="price" min="0" step="1" placeholder="Harga (Rp)" required />
        <input type="number" id="stock" min="1" step="1" value="1" placeholder="Stok" required />

        <div class="upload-zone">

          <input
            type="file"
            id="image"
            hidden
            accept="image/*"
          />

          <p>
            Klik atau drag gambar ke sini
          </p>

        </div>

        <img
          class="preview-image hidden"
        />

        <button type="submit">
          Tambah Limbah
        </button>

      </form>

    </main>
  `;

  setupUpload();
  setupSubmit();
  setupBackButton();
  injectStyle();
}

function setupUpload() {
  const zone = document.querySelector(".upload-zone");

  const input = document.getElementById("image");

  const preview = document.querySelector(".preview-image");

  zone.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];

    if (!file) return;

    // validasi image
    if (!file.type.startsWith("image/")) {
      alert("File harus gambar");

      return;
    }

    // max 5mb
    if (file.size > 5 * 1024 * 1024) {
      alert("Max 5MB");

      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      preview.src = e.target.result;

      preview.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
  });

  // drag over
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();

    zone.classList.add("active");
  });

  // drag leave
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("active");
  });

  // drop
  zone.addEventListener("drop", (e) => {
    e.preventDefault();

    zone.classList.remove("active");

    const file = e.dataTransfer.files[0];

    input.files = e.dataTransfer.files;

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      preview.src = event.target.result;

      preview.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
  });
}

function setupSubmit() {
  const form = document.querySelector(".waste-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;

    const description = document.getElementById("description").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock").value;

    const image = document.getElementById("image").files[0];

    if (!image) {
      alert("Foto wajib diupload");

      return;
    }

    const button = form.querySelector("button");

    button.disabled = true;

    button.innerText = "Uploading...";

    const formData = new FormData();

    formData.append("title", title);

    formData.append("description", description);

    formData.append("price", String(price));

    formData.append("stock", stock);

    formData.append("image", image);

    const result = await createWaste(formData);

    if (!result.success) {
      alert(result.message);

      button.disabled = false;

      button.innerText = "Tambah Limbah";

      return;
    }

    alert("Limbah berhasil ditambahkan");

    location.reload();
  });
}

function setupBackButton() {
  const button = document.querySelector(".back-btn");

  button.addEventListener("click", () => {
    location.reload();
  });
}

function injectStyle() {
  if (document.getElementById("waste-style")) return;

  const style = document.createElement("style");

  style.id = "waste-style";

  style.innerHTML = `

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 20px;
      flex-wrap: wrap;
    }

    .back-btn {
      padding: 12px 18px;
      background: var(--gray);
      color: white;
      border-radius: 10px;
    }

    .waste-form {
      background: white;
      padding: 24px;
      border-radius: 14px;
      box-shadow: var(--shadow);

      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .waste-form input,
    .waste-form textarea {

      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    .waste-form textarea {
      min-height: 120px;
      resize: vertical;
    }

    .upload-zone {

      border: 2px dashed var(--border);

      padding: 40px;

      border-radius: 14px;

      text-align: center;

      cursor: pointer;

      transition: 0.2s;
    }

    .upload-zone.active {
      border-color: var(--green);
      background: #f0fdf4;
    }

    .preview-image {

      width: 100%;
      max-height: 300px;
      object-fit: cover;
      border-radius: 14px;
    }

    .hidden {
      display: none;
    }

    .waste-form button {

      padding: 14px;

      background: var(--green);

      color: white;

      border-radius: 10px;

      font-weight: 700;
    }
  `;

  document.head.appendChild(style);
}
