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

  function pinIcon(num, active) {
    return L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin${active ? " is-active" : ""}"><span>${num}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
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

        playerMarker = L.circleMarker([stops[0].coordinates.lat, stops[0].coordinates.lng], {
          radius: 7,
          color: "#f3efe4",
          fillColor: "#4aa3ff",
          fillOpacity: 0.9,
          opacity: 0,
        }).addTo(map);
        accuracyCircle = L.circle([stops[0].coordinates.lat, stops[0].coordinates.lng], {
          radius: 1,
          color: "#4aa3ff",
          fillOpacity: 0.12,
          opacity: 0,
        }).addTo(map);

        map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { maxZoom: 16 });
        requestAnimationFrame(() => map.invalidateSize());
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
    focusStop(stop) {
      if (!map || !stop) return;
      map.setView([stop.coordinates.lat, stop.coordinates.lng], 17, { animate: false });
      this.setActive(stop.order);
    },
    setActive(order) {
      markers.forEach((marker, i) => {
        const stopOrder = i + 1;
        marker.setIcon(pinIcon(stopOrder, order === stopOrder));
      });
    },
    setPlayer(lat, lng, accuracy) {
      if (!playerMarker || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      playerMarker.setLatLng([lat, lng]).setStyle({ opacity: 1 });
      accuracyCircle.setLatLng([lat, lng]);
      if (Number.isFinite(accuracy)) {
        accuracyCircle.setRadius(accuracy).setStyle({ opacity: 0.6 });
      }
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
    },
  };
}
