import * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

const L = Leaflet.default ?? Leaflet;

export function geoJsonToLatLngs(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

export function createMapService() {
  let map = null;
  let routeLine = null;
  let markers = [];
  let playerMarker = null;
  let accuracyCircle = null;
  let tileLayer = null;
  let onTileError = null;
  let hasPlayerFix = false;

  function pinIcon(num, active) {
    return L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin${active ? " is-active" : ""}"><span>${num}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  function playerIcon() {
    return L.divIcon({
      className: "player-wrap",
      html: `<div class="player-dot" title="내 위치" aria-hidden="true"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  return {
    async mount(container, { stops, geoJsonUrl, onError, onTilesFailed }) {
      this.unmount();
      onTileError = onTilesFailed;
      try {
        map = L.map(container, {
          zoomControl: true,
          attributionControl: true,
        });
        map.attributionControl.setPrefix(false);
        tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        tileLayer.on("tileerror", () => onTileError?.());
        tileLayer.addTo(map);

        const response = await fetch(geoJsonUrl);
        if (!response.ok) throw new Error("geojson");
        const geo = await response.json();
        const coords = geo.features[0].geometry.coordinates;
        const latlngs = geoJsonToLatLngs(coords);
        routeLine = L.polyline(latlngs, {
          color: "#d4a054",
          weight: 5,
          opacity: 0.95,
        }).addTo(map);

        markers = stops.map((stop) =>
          L.marker([stop.coordinates.lat, stop.coordinates.lng], {
            icon: pinIcon(stop.order, false),
            keyboard: true,
            title: stop.title,
          }).addTo(map),
        );

        // Hidden until the first GPS fix; not parked on stop 1.
        playerMarker = L.marker([stops[0].coordinates.lat, stops[0].coordinates.lng], {
          icon: playerIcon(),
          keyboard: false,
          interactive: false,
          zIndexOffset: 1200,
          opacity: 0,
        }).addTo(map);
        accuracyCircle = L.circle([stops[0].coordinates.lat, stops[0].coordinates.lng], {
          radius: 1,
          color: "#4aa3ff",
          weight: 1,
          fillColor: "#4aa3ff",
          fillOpacity: 0,
          opacity: 0,
        }).addTo(map);
        hasPlayerFix = false;

        map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { maxZoom: 16 });
        requestAnimationFrame(() => {
          map?.invalidateSize();
        });
        return true;
      } catch {
        onError?.();
        return false;
      }
    },
    invalidate() {
      map?.invalidateSize();
    },
    focusOverview(stops) {
      if (!map) return;
      const bounds = L.latLngBounds(stops.map((s) => [s.coordinates.lat, s.coordinates.lng]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 16, animate: false });
      this.setActive(null);
    },
    focusStop(stop, playerFix) {
      if (!map || !stop) return;
      this.setActive(stop.order);
      const stopLatLng = L.latLng(stop.coordinates.lat, stop.coordinates.lng);
      if (
        playerFix &&
        Number.isFinite(playerFix.lat) &&
        Number.isFinite(playerFix.lng)
      ) {
        const bounds = L.latLngBounds([
          stopLatLng,
          L.latLng(playerFix.lat, playerFix.lng),
        ]);
        map.fitBounds(bounds.pad(0.35), { maxZoom: 17, animate: false });
        return;
      }
      map.setView(stopLatLng, 17, { animate: false });
    },
    setActive(order) {
      markers.forEach((marker, i) => {
        const stopOrder = i + 1;
        marker.setIcon(pinIcon(stopOrder, order === stopOrder));
      });
    },
    setPlayer(lat, lng, accuracy) {
      if (!playerMarker || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const latlng = L.latLng(lat, lng);
      playerMarker.setLatLng(latlng).setOpacity(1);
      accuracyCircle.setLatLng(latlng);
      if (Number.isFinite(accuracy) && accuracy > 0) {
        accuracyCircle.setRadius(accuracy).setStyle({ opacity: 0.55, fillOpacity: 0.14 });
      } else {
        accuracyCircle.setStyle({ opacity: 0, fillOpacity: 0 });
      }
      hasPlayerFix = true;
      if (typeof playerMarker.setZIndexOffset === "function") {
        playerMarker.setZIndexOffset(1200);
      }
      this.ensurePlayerVisible(lat, lng);
    },
    ensurePlayerVisible(lat, lng) {
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const latlng = L.latLng(lat, lng);
      if (!map.getBounds().pad(-0.15).contains(latlng)) {
        map.panTo(latlng, { animate: true, duration: 0.35 });
      }
    },
    hasPlayer() {
      return hasPlayerFix;
    },
    unmount() {
      if (tileLayer && onTileError) tileLayer.off("tileerror");
      if (map) {
        map.remove();
      }
      map = null;
      routeLine = null;
      markers = [];
      playerMarker = null;
      accuracyCircle = null;
      tileLayer = null;
      hasPlayerFix = false;
    },
  };
}
