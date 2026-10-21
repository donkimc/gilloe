import * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_ATTRIBUTION, OSM_TILE_MAX_ZOOM, OSM_TILE_URL } from "./mapConfig.js";

const L = Leaflet.default ?? Leaflet;

export function createRouteEditor() {
  let map = null;
  let line = null;
  let markers = [];
  let vertexMarkers = [];
  let player = null;
  let onMapClick = null;
  let onStopDrag = null;
  let onVertexDrag = null;

  function pin(num) {
    return L.divIcon({
      className: "pin-wrap",
      html: `<div class="pin is-active"><span>${num}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  return {
    mount(container) {
      this.unmount();
      map = L.map(container, { zoomControl: true, attributionControl: true });
      map.attributionControl.setPrefix(false);
      L.tileLayer(OSM_TILE_URL, { maxZoom: OSM_TILE_MAX_ZOOM, attribution: OSM_ATTRIBUTION }).addTo(map);
      map.setView([37.53865, 127.12385], 16);
      map.on("click", (event) => onMapClick?.(event.latlng.lat, event.latlng.lng));
      line = L.polyline([], { color: "#d4a054", weight: 5 }).addTo(map);
      player = L.circleMarker([37.53865, 127.12385], {
        radius: 7,
        color: "#f3efe4",
        fillColor: "#4aa3ff",
        fillOpacity: 0.9,
        opacity: 0,
      }).addTo(map);
      requestAnimationFrame(() => map.invalidateSize());
    },
    setClick(fn) {
      onMapClick = fn;
    },
    setStopDrag(fn) {
      onStopDrag = fn;
    },
    setVertexDrag(fn) {
      onVertexDrag = fn;
    },
    setLine(coords) {
      if (!line) return;
      const latlngs = (coords || []).map(([lng, lat]) => [lat, lng]);
      line.setLatLngs(latlngs);
    },
    setStops(stops, draggable) {
      markers.forEach((m) => m.remove());
      markers = (stops || []).map((stop) => {
        const marker = L.marker([stop.lat, stop.lng], { icon: pin(stop.order), draggable: Boolean(draggable), title: stop.title || stop.name });
        marker.addTo(map);
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onStopDrag?.(stop.id, ll.lat, ll.lng);
        });
        return marker;
      });
    },
    setVertices(vertices, draggable) {
      vertexMarkers.forEach((m) => m.remove());
      vertexMarkers = (vertices || []).map((pair, index) => {
        const marker = L.circleMarker([pair[1], pair[0]], {
          radius: 6,
          color: "#142839",
          fillColor: "#f3efe4",
          fillOpacity: 1,
          draggable: false,
        });
        marker.addTo(map);
        if (draggable) {
          marker.on("click", (event) => {
            event.originalEvent?.stopPropagation();
            onVertexDrag?.(index, pair[1], pair[0], "select");
          });
        }
        return marker;
      });
    },
    setPlayer(lat, lng) {
      if (!player || !Number.isFinite(lat)) return;
      player.setLatLng([lat, lng]).setStyle({ opacity: 1 });
    },
    fit(coords, stops) {
      if (!map) return;
      const pts = [];
      (coords || []).forEach(([lng, lat]) => pts.push([lat, lng]));
      (stops || []).forEach((s) => pts.push([s.lat, s.lng]));
      if (pts.length >= 2) map.fitBounds(L.latLngBounds(pts).pad(0.18), { maxZoom: 17 });
      else if (pts.length === 1) map.setView(pts[0], 16);
      map.invalidateSize();
    },
    unmount() {
      markers.forEach((m) => m.remove());
      vertexMarkers.forEach((m) => m.remove());
      if (map) map.remove();
      map = null;
      line = null;
      markers = [];
      vertexMarkers = [];
      player = null;
    },
  };
}
