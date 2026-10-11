import {
  createStore
}
from '../../services/store.js';

import {
  showToast
}
from '../../utils/toast.js';

export function renderCreateStore() {

  const app =
    document.getElementById(
      'app'
    );

  app.innerHTML = `

    <main class="container">

      <div class="form-card">

        <h1>
          Buat Toko
        </h1>

        <form id="store-form">

          <input
            type="text"
            placeholder="Nama toko"
            id="name"
            required
          />

          <textarea
            placeholder="Deskripsi toko"
            id="description"
          ></textarea>

          <input
            type="file"
            id="image"
            accept="image/*"
          />

          <button>
            Buat Toko
          </button>

        </form>

      </div>

    </main>
  `;

  setupForm();
}

function setupForm() {

  const form =
    document.getElementById(
      'store-form'
    );

  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      const name =
        document.getElementById(
          'name'
        ).value;

      const description =
        document.getElementById(
          'description'
        ).value;

      const image =
        document.getElementById(
          'image'
        ).files[0];

      const formData =
        new FormData();

      formData.append(
        'name',
        name
      );

      formData.append(
        'description',
        description
      );

      if (image) {

        formData.append(
          'image',
          image
        );
      }

      const result =
        await createStore(
          formData
        );

      if (!result.success) {

        showToast(
          result.message,
          'error'
        );

        return;
      }

      showToast(
        'Toko berhasil dibuat'
      );

      location.reload();
    }
  );
}