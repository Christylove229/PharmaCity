import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix bug Leaflet avec Vite (icônes manquantes)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Icônes personnalisées
const createIcon = (color: string, label: string) =>
  L.divIcon({
    html: `<div style="
      background:${color};
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:14px;">${label}</span>
    </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

const livreurIcon = createIcon("#16a34a", "🛵");
const clientIcon  = createIcon("#ef4444", "📦");
const pharmacieIcon = createIcon("#2563eb", "💊");

interface DeliveryMapProps {
  livreurPos?: { lat: number; lng: number };
  clientPos?:  { lat: number; lng: number; label?: string };
  pharmaciePos?: { lat: number; lng: number; label?: string };
  height?: string;
}

const DeliveryMap = ({
  livreurPos,
  clientPos,
  pharmaciePos,
  height = "320px",
}: DeliveryMapProps) => {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;

    // Centre par défaut : Cotonou, Bénin
    const center: [number, number] =
      livreurPos
        ? [livreurPos.lat, livreurPos.lng]
        : clientPos
        ? [clientPos.lat, clientPos.lng]
        : [6.3654, 2.4183];

    const map = L.map(mapRef.current).setView(center, 14);
    mapObjRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // Marqueur Livreur
    if (livreurPos) {
      L.marker([livreurPos.lat, livreurPos.lng], { icon: livreurIcon })
        .addTo(map)
        .bindPopup("<b>🛵 Vous êtes ici</b>")
        .openPopup();
    }

    // Marqueur Client
    if (clientPos) {
      L.marker([clientPos.lat, clientPos.lng], { icon: clientIcon })
        .addTo(map)
        .bindPopup(`<b>📦 Client</b><br>${clientPos.label || "Adresse de livraison"}`);
    }

    // Marqueur Pharmacie
    if (pharmaciePos) {
      L.marker([pharmaciePos.lat, pharmaciePos.lng], { icon: pharmacieIcon })
        .addTo(map)
        .bindPopup(`<b>💊 Pharmacie</b><br>${pharmaciePos.label || ""}`);
    }

    // Tracer une ligne entre pharmacie → client
    if (pharmaciePos && clientPos) {
      L.polyline(
        [
          [pharmaciePos.lat, pharmaciePos.lng],
          [clientPos.lat, clientPos.lng],
        ],
        { color: "#16a34a", weight: 3, dashArray: "8 6", opacity: 0.7 }
      ).addTo(map);
    }

    // Ajuster le zoom pour tout voir
    const points: [number, number][] = [];
    if (livreurPos)   points.push([livreurPos.lat, livreurPos.lng]);
    if (clientPos)    points.push([clientPos.lat, clientPos.lng]);
    if (pharmaciePos) points.push([pharmaciePos.lat, pharmaciePos.lng]);
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }

    return () => { map.remove(); mapObjRef.current = null; };
  }, []);

  // Mise à jour du marqueur livreur en temps réel
  useEffect(() => {
    if (!mapObjRef.current || !livreurPos) return;
    mapObjRef.current.setView([livreurPos.lat, livreurPos.lng], 15);
  }, [livreurPos]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "12px", zIndex: 0 }}
      className="shadow-lg border border-slate-200"
    />
  );
};

export default DeliveryMap;
