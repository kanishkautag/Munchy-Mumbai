import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- FIX FOR BROKEN LEAFLET ICONS IN REACT ---
// React-Leaflet sometimes fails to load default icons. This fixes it.
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- TYPES ---
interface ContextMapProps {
    coordinates?: { lat: number; lng: number } | null;
    onSelect?: (coords: { lat: number; lng: number }) => void;
}

// --- HELPER: ANIMATE MAP MOVEMENT ---
// This component listens for coordinate changes and "flies" the map to the new location.
function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 2.5, easeLinearity: 0.25 });
        }
    }, [center, map]);
    return null;
}

// --- MAIN COMPONENT ---
export function ContextMap({ coordinates }: ContextMapProps) {
    // Default Center: Dadar, Mumbai (Center of the city)
    const defaultCenter = { lat: 19.0178, lng: 72.8478 };
    const activeCenter = coordinates || defaultCenter;

    return (
        <MapContainer 
            center={activeCenter} 
            zoom={12} 
            style={{ height: '100%', width: '100%', background: '#0f172a' }} // Matches slate-900
            zoomControl={false} // Cleaner look
        >
            {/* Dark Theme Tiles matching your "Mumbai Midnight" CSS */}
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Render Marker if we have coordinates */}
            {coordinates && (
                <>
                    <Marker position={coordinates}>
                        <Popup className="font-sans text-xs">
                            📍 <b>Selected Restaurant</b>
                        </Popup>
                    </Marker>
                    <MapUpdater center={coordinates} />
                </>
            )}
        </MapContainer>
    );
}