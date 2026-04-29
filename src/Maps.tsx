import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

// Fix Leaflet's default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/71/71336.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const destIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export const OpenMap = ({ center, children, zoom = 13 }: { center: {lat: number, lng: number}, children?: React.ReactNode, zoom?: number }) => {
    return (
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {children}
            <MapUpdater center={center} />
        </MapContainer>
    );
};

// Component to dynamically update map center when props change
const MapUpdater = ({ center }: { center: {lat: number, lng: number} }) => {
    const map = useMap();
    useEffect(() => {
        if (map && (map as any)._container) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export const OpenMarker: React.FC<{ position: {lat: number, lng: number}, type?: 'driver' | 'dest' | 'default' }> = ({ position, type = 'default' }) => {
    let icon: L.Icon | L.DivIcon = new L.Icon.Default();
    if (type === 'driver') icon = truckIcon;
    if (type === 'dest') icon = destIcon;
    
    return <Marker position={position} icon={icon} />;
};

export const OpenRouting = ({ origin, destination }: { origin: {lat: number, lng: number}, destination: {lat: number, lng: number} }) => {
    const map = useMap();
    const routingControlRef = React.useRef<any>(null);

    // Initial setup
    useEffect(() => {
        if (!map) return;
        
        const LRM = (L as any).Routing;
        if (!LRM) return;

        const control = LRM.control({
            waypoints: [
                L.latLng(origin.lat, origin.lng),
                L.latLng(destination.lat, destination.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
            lineOptions: {
                styles: [{ color: '#3b82f6', weight: 4 }]
            },
            createMarker: function() { return null; }
        }).addTo(map);

        routingControlRef.current = control;

        return () => {
            if (routingControlRef.current) {
                try {
                    const ctrl = routingControlRef.current;
                    // Check if map still exists and is not being destroyed
                    if (map && (map as any)._container) {
                        const isAttached = ctrl._map || (ctrl.getPlan && ctrl.getPlan()._map);
                        if (isAttached && typeof map.removeControl === 'function') {
                            map.removeControl(ctrl);
                        }
                    }
                } catch (err) {
                    // Fail silently for cleanup errors to avoid crashing the UI
                    console.debug('Handled Leaflet routing cleanup exception:', err);
                } finally {
                    routingControlRef.current = null;
                }
            }
        };
    }, [map]); // Only create once for this map instance

    // Update waypoints when coordinates change
    useEffect(() => {
        if (routingControlRef.current) {
            routingControlRef.current.setWaypoints([
                L.latLng(origin.lat, origin.lng),
                L.latLng(destination.lat, destination.lng)
            ]);
        }
    }, [origin.lat, origin.lng, destination.lat, destination.lng]);

    return null;
}
