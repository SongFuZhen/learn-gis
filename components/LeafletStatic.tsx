"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { gaodeBase } from "@/lib/mapTiles";

const icon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#6d5efc;border:2px solid #fff;box-shadow:0 0 0 2px #6d5efc"></div>',
});

export default function LeafletStatic({
  lat,
  lng,
  zoom = 4,
}: {
  lat: number;
  lng: number;
  zoom?: number;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom={false}
    >
      <TileLayer {...gaodeBase} />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
