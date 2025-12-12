import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- STANDARD LEAFLET ICON FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CONTROLLER ---
function MapController({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 16, {
        animate: true,
        duration: 2
      });
    }
  }, [coords, map]);

  return null;
}

// --- INTERFACE UPDATE (The Fix) ---
interface ContextMapProps {
  coordinates: { lat: number; lng: number } | null;
  onSelect?: (coords: { lat: number; lng: number }) => void; // Added this line!
}

const MUMBAI_CENTER = { lat: 19.0760, lng: 72.8777 };

export function ContextMap({ coordinates }: ContextMapProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="h-full w-full bg-slate-100 rounded-xl overflow-hidden border border-white/10"
    >
      <MapContainer
        center={[MUMBAI_CENTER.lat, MUMBAI_CENTER.lng]}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController coords={coordinates} />

        {coordinates && (
          <Marker position={[coordinates.lat, coordinates.lng]}>
            <Popup>Selected Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </motion.div>
  );
}