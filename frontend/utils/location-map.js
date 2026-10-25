const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const DEFAULT_MAP_CENTER = [5.5483, 95.3238];

let leafletPromise;
let lastReverseGeocodeAt = 0;

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
  if (!district || !city || !province)
    throw new Error('Pilih kecamatan, kabupaten/kota, dan provinsi terlebih dahulu.');
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
    if (!response.ok)
      throw new Error('Lokasi alamat belum dapat dicari. Periksa koneksi lalu coba lagi.');
    const [result] = await response.json();
    if (!result || !Array.isArray(result.boundingbox) || result.boundingbox.length !== 4) continue;
    const [south, north, west, east] = result.boundingbox.map(Number);
    const center = [Number(result.lat), Number(result.lon)];
    if (![south, north, west, east, ...center].every(Number.isFinite)) continue;
    return {
      center,
      bounds: [
        [south, west],
        [north, east],
      ],
      locality: candidate.locality,
    };
  }
  throw new Error('Lokasi alamat belum ditemukan. Periksa pilihan desa/kelurahan dan coba lagi.');
}

export async function reverseGeocodeCoordinates(
  latitude,
  longitude,
  signal = new AbortController().signal,
) {
  const delay = Math.max(0, 1100 - (Date.now() - lastReverseGeocodeAt));
  if (delay) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(signal.reason || new Error('Pencarian alamat dibatalkan.'));
        },
        { once: true },
      );
    });
  }
  if (signal.aborted) throw signal.reason || new Error('Pencarian alamat dibatalkan.');
  lastReverseGeocodeAt = Date.now();
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  if (!response.ok)
    throw new Error('Alamat titik peta belum dapat dicari. Periksa koneksi lalu coba lagi.');
  const result = await response.json();
  const address = result.address || {};
  if (address.country_code && address.country_code.toLowerCase() !== 'id')
    throw new Error('Titik peta harus berada di Indonesia.');
  const names = {
    province: [address.state, address.province, address.region].filter(Boolean),
    city: [address.city, address.municipality, address.county, address.state_district].filter(
      Boolean,
    ),
    district: [address.city_district, address.district, address.borough, address.suburb].filter(
      Boolean,
    ),
    village: [
      address.village,
      address.hamlet,
      address.neighbourhood,
      address.quarter,
      address.suburb,
    ].filter(Boolean),
  };
  if (
    !names.province.length ||
    !names.city.length ||
    !names.district.length ||
    !names.village.length
  )
    throw new Error(
      'Wilayah lengkap titik ini belum ditemukan. Coba pilih titik yang lebih dekat ke alamat.',
    );
  return names;
}

export function googleMapsDirectionsUrl(latitude, longitude) {
  if (!validCoordinates(latitude, longitude)) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${Number(latitude)},${Number(longitude)}`)}`;
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
  allowRegionChange = false,
  onAddressChange = async () => {},
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
  let areaRequired = !allowRegionChange && (requireArea || Boolean(initialArea?.district));
  const shouldLocateArea = requireArea || Boolean(initialArea?.district);
  let area = null;
  let areaError = '';
  if (shouldLocateArea) {
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
  const map = leaflet
    .map(element)
    .setView(initial, area || hasInitialLocation ? 16 : areaRequired ? 2 : 14);
  if (area)
    map.setMaxBounds(allowRegionChange ? null : leaflet.latLngBounds(area.bounds).pad(0.02));
  addMapTiles(leaflet, map);
  const directionsLink = document.createElement('a');
  directionsLink.className = 'fi-button fi-button-outline';
  directionsLink.target = '_blank';
  directionsLink.rel = 'noopener';
  directionsLink.textContent = 'Buka di Google Maps';
  directionsLink.hidden = true;
  element.parentElement?.querySelector('.fi-map-controls')?.append(directionsLink);

  let marker;
  let areaRevision = 0;
  let reverseGeocodeController;
  const clearPickerArea = () => {
    area = null;
    areaRevision += 1;
    reverseGeocodeController?.abort();
    reverseGeocodeController = null;
    map.setMaxBounds(null);
    marker?.remove();
    marker = null;
    latitudeInput.value = '';
    longitudeInput.value = '';
    directionsLink.removeAttribute('href');
    directionsLink.hidden = true;
    onChange(null, null);
  };
  const update = (latitude, longitude, resolveAddress = false) => {
    if (!validCoordinates(latitude, longitude)) return;
    const point = [Number(latitude), Number(longitude)];
    if (!allowRegionChange && areaRequired && !area) {
      status.textContent = 'Pilih kecamatan terlebih dahulu agar titik pickup sesuai wilayah.';
      return;
    }
    if (!allowRegionChange && area && !leaflet.latLngBounds(area.bounds).contains(point)) {
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
      update(position.lat, position.lng, true);
    });
    status.textContent = `Mencari alamat untuk titik ${point[0].toFixed(6)}, ${point[1].toFixed(6)}…`;
    directionsLink.href = googleMapsDirectionsUrl(...point);
    directionsLink.hidden = false;
    onChange(point[0], point[1]);
    if (resolveAddress) {
      reverseGeocodeController?.abort();
      reverseGeocodeController = new AbortController();
      const { signal } = reverseGeocodeController;
      const addressRevision = ++areaRevision;
      Promise.resolve(onAddressChange(null))
        .then(() => {
          if (addressRevision !== areaRevision || !element.isConnected) return null;
          return reverseGeocodeCoordinates(...point, signal);
        })
        .then(async (names) => {
          if (!names || addressRevision !== areaRevision || !element.isConnected) return;
          await onAddressChange(names);
          if (addressRevision === areaRevision && element.isConnected)
            status.textContent = `Alamat diperbarui: ${names.village[0]}, ${names.district[0]}, ${names.city[0]}, ${names.province[0]}.`;
        })
        .catch((error) => {
          if (addressRevision !== areaRevision || !element.isConnected) return;
          if (addressRevision === areaRevision && element.isConnected)
            status.textContent = error.message || 'Alamat titik peta belum dapat ditentukan.';
        });
    }
  };

  if (area && hasInitialLocation && leaflet.latLngBounds(area.bounds).contains(initial))
    update(initialLocation.latitude, initialLocation.longitude);
  else if (area)
    status.textContent = `Peta dipusatkan di ${area.locality}. Klik titik lokasi yang sesuai alamat.`;
  else if (areaError) status.textContent = areaError;
  else if (areaRequired)
    status.textContent = areaError || 'Pilih kecamatan agar peta mengikuti wilayah alamat pickup.';
  else if (hasInitialLocation) update(...initial);
  else status.textContent = 'Klik peta untuk memilih titik alamat.';
  map.on('click', (event) => update(event.latlng.lat, event.latlng.lng, true));
  locateButton?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Perangkat ini tidak mendukung lokasi otomatis. Pilih titik pada peta.';
      return;
    }
    status.textContent = 'Mencari lokasi perangkat…';
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update(coords.latitude, coords.longitude, true);
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
        directionsLink.removeAttribute('href');
        directionsLink.hidden = true;
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
      directionsLink.removeAttribute('href');
      directionsLink.hidden = true;
      status.textContent = 'Klik peta untuk memilih titik alamat.';
      onChange(null, null);
    },
    destroy() {
      reverseGeocodeController?.abort();
      map.remove();
    },
  };
}
