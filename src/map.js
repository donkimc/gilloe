import * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { pointAlong, sliceLine } from "./geo.js";

const L = Leaflet.default ?? Leaflet;

export function geoJsonToLatLngs(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

export function createMapService() {
  let map = null;
  let ghostLine = null;
  let drawnLine = null;
  let markers = [];
  let playerMarker = null;
  let accuracyCircle = null;
  let walker = null;
  let tileLayer = null;
  let onTileError = null;
  let coords = [];

  function pinIcon(num, active) {
    return L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin${active ? " is-active" : ""}"><span>${num}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  return {
    async mount(container, { places, routeLine, onError, onTilesFailed }) {
      this.unmount();
      onTileError = onTilesFailed;
      try {
        map = L.map(container, { zoomControl: true, attributionControl: true });
        map.attributionControl.setPrefix(false);
        tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        tileLayer.on("tileerror", () => onTileError?.());
        tileLayer.addTo(map);

        coords = Array.isArray(routeLine) && routeLine.length >= 2 ? routeLine : places.map((p) => [p.lng, p.lat]);
        const latlngs = geoJsonToLatLngs(coords);
        ghostLine = L.polyline(latlngs, { color: "#8a7044", weight: 6, opacity: 0.45 }).addTo(map);
        drawnLine = L.polyline([], { color: "#d4a054", weight: 5, opacity: 1 }).addTo(map);

        markers = places.map((place) =>
          L.marker([place.lat, place.lng], {
            icon: pinIcon(place.order, false),
            title: place.name,
          }).addTo(map),
        );

        playerMarker = L.circleMarker([places[0].lat, places[0].lng], {
          radius: 7,
          color: "#f3efe4",
          fillColor: "#4aa3ff",
          fillOpacity: 0.9,
          opacity: 0,
        }).addTo(map);
        accuracyCircle = L.circle([places[0].lat, places[0].lng], {
          radius: 1,
          color: "#4aa3ff",
          fillOpacity: 0.12,
          opacity: 0,
        }).addTo(map);
        walker = L.circleMarker(latlngs[0], {
          radius: 8,
          color: "#1a1206",
          fillColor: "#f3efe4",
          fillOpacity: 1,
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
    focusOverview(places) {
      if (!map) return;
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 16, animate: false });
      this.setActive(null);
      this.setLineProgress(1);
      this.showWalker(false);
    },
    focusStop(place) {
      if (!map || !place) return;
      map.setView([place.lat, place.lng], 17, { animate: false });
      this.setActive(place.order);
      this.showWalker(false);
    },
    setActive(order) {
      markers.forEach((marker, i) => marker.setIcon(pinIcon(i + 1, order === i + 1)));
    },
    setPlayer(lat, lng, accuracy) {
      if (!playerMarker || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      playerMarker.setLatLng([lat, lng]).setStyle({ opacity: 1 });
      accuracyCircle.setLatLng([lat, lng]);
      if (Number.isFinite(accuracy)) accuracyCircle.setRadius(accuracy).setStyle({ opacity: 0.6 });
    },
    setLineProgress(t) {
      if (!coords.length || !drawnLine) return;
      const sliced = sliceLine(coords, t);
      drawnLine.setLatLngs(sliced.map(([lng, lat]) => [lat, lng]));
      const { coord } = pointAlong(coords, t);
      walker?.setLatLng([coord[1], coord[0]]);
    },
    showWalker(show) {
      walker?.setStyle({ opacity: show ? 1 : 0 });
    },
    unmount() {
      if (tileLayer && onTileError) tileLayer.off("tileerror");
      if (map) map.remove();
      map = null;
      ghostLine = null;
      drawnLine = null;
      markers = [];
      playerMarker = null;
      accuracyCircle = null;
      walker = null;
      tileLayer = null;
      coords = [];
    },
  };
}
