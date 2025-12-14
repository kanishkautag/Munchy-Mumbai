import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

// --- TYPES ---
interface ContextMapProps {
    coordinates: { lat: number; lng: number } | null;
    onSelect?: (coords: { lat: number; lng: number }) => void;
}

// --- CONTROLLER (THE FIX) ---
// This component handles the "Flying" animation and fixing the "Grey Map" glitch
function MapController({ coords }: { coords: { lat: number; lng: number } | null }) {
    const map = useMap();

    useEffect(() => {
        if (coords) {
            // 1. Fly to new location
            map.flyTo([coords.lat, coords.lng], 16, {
                animate: true,
                duration: 2
            });

            // 2. CRITICAL FIX: Force the map to resize correctly
            // This prevents the "Grey Box" issue when the sidebar opens
            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }
    }, [coords, map]);

    return null;
}

export function ContextMap({ coordinates }: ContextMapProps) {
    // Default Center: Mumbai
    const defaultCenter = { lat: 19.0760, lng: 72.8777 };
    const activeCenter = coordinates || defaultCenter;

    // We create a unique key. Changing this forces React to completely destroy 
    // and rebuild the map, which ensures it always renders fresh.
    const mapKey = coordinates ? `map-${coordinates.lat}-${coordinates.lng}` : 'map-default';

    return (
        <div className="h-full w-full bg-slate-100 rounded-xl overflow-hidden border border-white/10 relative z-0">
            <MapContainer
                key={mapKey} // <--- Forces re-render to fix glitches
                center={[activeCenter.lat, activeCenter.lng]}
                zoom={coordinates ? 16 : 11}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false} // Cleaner look
            >
                {/* STANDARD OPENSTREETMAP TILES */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController coords={coordinates} />

                {coordinates && (
                    <Marker position={[coordinates.lat, coordinates.lng]}>
                        <Popup className="font-sans text-sm">
                            📍 <b>Selected Location</b>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}