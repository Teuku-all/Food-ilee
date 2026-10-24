const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletPromise;

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = LEAFLET_CSS;
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) document.head.append(stylesheet);

  leafletPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () =>
      window.L ? resolve(window.L) : reject(new Error('Peta belum dapat dimuat.'));
    script.onerror = () => reject(new Error('Peta belum dapat dimuat. Periksa koneksi internet.'));
    document.head.append(script);
  }).catch((error) => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
}

export function validCoordinates(latitude, longitude) {
  return (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== '' &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== '' &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

export async function mountLocationPicker({
  element,
  latitudeInput,
  longitudeInput,
  status,
  locateButton,
  initialLocation,
  onChange = () => {},
}) {
  if (!document.getElementById('fi-location-map-style')) {
    const style = document.createElement('style');
    style.id = 'fi-location-map-style';
    style.textContent =
      '.fi-location-map{height:300px;min-height:240px;overflow:hidden;border:1px solid #d4e2dc;border-radius:14px;background:#e8efeb}.fi-map-controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:10px 0 14px}.fi-map-controls>span{color:#61746a;font-size:12px}.fi-map-controls .fi-button{min-height:36px}.fi-map-label small{display:block;margin-top:4px;color:#74827b;font-weight:400}';
    document.head.append(style);
  }
  const leaflet = await loadLeaflet();
  if (!element.isConnected) return { destroy() {} };
  const hasInitialLocation = validCoordinates(
    initialLocation?.latitude,
    initialLocation?.longitude,
  );
  const initial = hasInitialLocation
    ? [Number(initialLocation.latitude), Number(initialLocation.longitude)]
    : [-2.5, 118];
  const map = leaflet.map(element).setView(initial, hasInitialLocation ? 16 : 5);
  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(map);

  let marker;
  const update = (latitude, longitude) => {
    if (!validCoordinates(latitude, longitude)) return;
    const point = [Number(latitude), Number(longitude)];
    latitudeInput.value = String(point[0]);
    longitudeInput.value = String(point[1]);
    if (!marker) marker = leaflet.marker(point, { draggable: true }).addTo(map);
    else marker.setLatLng(point);
    marker.off('dragend');
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      update(position.lat, position.lng);
    });
    status.textContent = `Titik dipilih: ${point[0].toFixed(6)}, ${point[1].toFixed(6)}`;
    onChange(point[0], point[1]);
  };

  if (hasInitialLocation) update(...initial);
  else status.textContent = 'Klik peta untuk memilih titik alamat.';
  map.on('click', (event) => update(event.latlng.lat, event.latlng.lng));
  locateButton?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Perangkat ini tidak mendukung lokasi otomatis. Pilih titik pada peta.';
      return;
    }
    status.textContent = 'Mencari lokasi perangkat…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update(coords.latitude, coords.longitude);
        map.setView([coords.latitude, coords.longitude], 17);
      },
      () => {
        status.textContent = 'Lokasi perangkat tidak tersedia. Pilih titik pada peta.';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });

  requestAnimationFrame(() => map.invalidateSize());
  return {
    setLocation(latitude, longitude) {
      if (!validCoordinates(latitude, longitude)) return;
      update(latitude, longitude);
      map.setView([Number(latitude), Number(longitude)], 17);
    },
    clearLocation() {
      marker?.remove();
      marker = null;
      latitudeInput.value = '';
      longitudeInput.value = '';
      status.textContent = 'Klik peta untuk memilih titik alamat.';
      onChange(null, null);
    },
    destroy() {
      map.remove();
    },
  };
}
