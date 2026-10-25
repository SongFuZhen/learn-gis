"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { gaodeBase } from "@/lib/mapTiles";

/** 右下角实时坐标读数：拖动地图时随中心点变化 */
function CoordReadout({ lat, lng }: { lat: number; lng: number }) {
  const [center, setCenter] = useState({ lat, lng });
  useMapEvents({ move: (e) => setCenter(e.target.getCenter()) });
  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-[1000] select-none rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white"
    >
      {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E
    </div>
  );
}

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
      <CoordReadout lat={lat} lng={lng} />
    </MapContainer>
  );
}
