const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const DEFAULT_MAP_CENTER = [5.5483, 95.3238];

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

export function addMapTiles(leaflet, map) {
  const attribution =
    'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community';
  const base = leaflet
    .tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 16,
        maxZoom: 19,
        attribution,
      },
    )
    .addTo(map);
  leaflet
    .tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 16,
        maxZoom: 19,
        attribution,
      },
    )
    .addTo(map);
  return base;
}

async function geocodeRegion(region) {
  const district = String(region?.district || '').trim();
  const city = String(region?.city || '').trim();
  const province = String(region?.province || '').trim();
  if (!district || !city || !province) throw new Error('Pilih kecamatan, kabupaten/kota, dan provinsi terlebih dahulu.');
  const village = String(region?.village || '').trim();
  const candidates = [
    ...(village && village !== 'Pilih desa/kelurahan'
      ? [{ locality: village, query: [village, district, city, province, 'Indonesia'] }]
      : []),
    { locality: district, query: [district, city, province, 'Indonesia'] },
    { locality: city, query: [city, province, 'Indonesia'] },
  ];
  for (const candidate of candidates) {
    const query = new URLSearchParams({
      q: candidate.query.join(', '),
      format: 'jsonv2',
      limit: '1',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Lokasi alamat belum dapat dicari. Periksa koneksi lalu coba lagi.');
    const [result] = await response.json();
    if (!result || !Array.isArray(result.boundingbox) || result.boundingbox.length !== 4) continue;
    const [south, north, west, east] = result.boundingbox.map(Number);
    const center = [Number(result.lat), Number(result.lon)];
    if (![south, north, west, east, ...center].every(Number.isFinite)) continue;
    return {
      center,
      bounds: [[south, west], [north, east]],
      locality: candidate.locality,
    };
  }
  throw new Error('Lokasi alamat belum ditemukan. Periksa pilihan desa/kelurahan dan coba lagi.');
}

export async function mountLocationPicker({
  element,
  latitudeInput,
  longitudeInput,
  status,
  locateButton,
  initialLocation,
  initialArea,
  requireArea = false,
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
  let areaRequired = requireArea || Boolean(initialArea?.district);
  let area = null;
  let areaError = '';
  if (areaRequired) {
    try {
      area = await geocodeRegion(initialArea);
    } catch (error) {
      areaError = error.message;
    }
    if (!element.isConnected) return { destroy() {} };
  }
  const hasInitialLocation = validCoordinates(
    initialLocation?.latitude,
    initialLocation?.longitude,
  );
  const initial = area
    ? area.center
    : hasInitialLocation
      ? [Number(initialLocation.latitude), Number(initialLocation.longitude)]
      : areaRequired
        ? [0, 0]
        : DEFAULT_MAP_CENTER;
  const map = leaflet.map(element).setView(initial, area || hasInitialLocation ? 16 : areaRequired ? 2 : 14);
  if (area) map.setMaxBounds(leaflet.latLngBounds(area.bounds).pad(0.02));
  addMapTiles(leaflet, map);

  let marker;
  let areaRevision = 0;
  const clearPickerArea = () => {
    area = null;
    areaRevision += 1;
    map.setMaxBounds(null);
    marker?.remove();
    marker = null;
    latitudeInput.value = '';
    longitudeInput.value = '';
    onChange(null, null);
  };
  const update = (latitude, longitude) => {
    if (!validCoordinates(latitude, longitude)) return;
    const point = [Number(latitude), Number(longitude)];
    if (areaRequired && !area) {
      status.textContent = 'Pilih kecamatan terlebih dahulu agar titik pickup sesuai wilayah.';
      return;
    }
    if (area && !leaflet.latLngBounds(area.bounds).contains(point)) {
      if (marker && validCoordinates(latitudeInput.value, longitudeInput.value))
        marker.setLatLng([Number(latitudeInput.value), Number(longitudeInput.value)]);
      status.textContent = 'Titik harus berada di dalam kecamatan yang dipilih.';
      return;
    }
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

  if (area && hasInitialLocation && leaflet.latLngBounds(area.bounds).contains(initial))
    update(initialLocation.latitude, initialLocation.longitude);
  else if (area) status.textContent = `Peta dipusatkan di ${area.locality}. Klik titik lokasi yang sesuai alamat.`;
  else if (areaRequired) status.textContent = areaError || 'Pilih kecamatan agar peta mengikuti wilayah alamat pickup.';
  else if (hasInitialLocation) update(...initial);
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
    async setArea(region) {
      areaRequired = true;
      clearPickerArea();
      const revision = ++areaRevision;
      status.textContent = 'Mencari batas wilayah kecamatan…';
      const resolved = await geocodeRegion(region);
      if (revision !== areaRevision || !map.getContainer().isConnected) return;
      area = resolved;
      areaError = '';
      const bounds = leaflet.latLngBounds(area.bounds);
      map.setMaxBounds(bounds.pad(0.02));
      map.fitBounds(bounds);
      if (marker && !bounds.contains(marker.getLatLng())) {
        marker.remove();
        marker = null;
        latitudeInput.value = '';
        longitudeInput.value = '';
        onChange(null, null);
      }
      status.textContent = `Peta dipusatkan di ${area.locality}. Klik titik lokasi yang sesuai alamat.`;
    },
    clearArea() {
      areaRequired = true;
      clearPickerArea();
      status.textContent = 'Pilih kecamatan agar peta mengikuti wilayah alamat pickup.';
    },
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
