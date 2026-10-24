"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { gaodeBase } from "@/lib/mapTiles";

type LatLng = { lat: number; lng: number };

function ClickCapture({
  onPick,
  disabled,
}: {
  onPick: (p: LatLng) => void;
  disabled?: boolean;
}) {
  const map = useMapEvents({
    click(e) {
      if (disabled) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  // 测试钩子：冒烟脚本用 window.__quizMap 在指定坐标触发 click
  useEffect(() => {
    (window as unknown as { __quizMap?: unknown }).__quizMap = map;
    return () => {
      delete (window as unknown as { __quizMap?: unknown }).__quizMap;
    };
  }, [map]);
  return null;
}

export default function MapPicker({
  center,
  zoom = 2,
  selected,
  onPick,
  disabled,
}: {
  center: [number, number];
  zoom?: number;
  selected: LatLng | null;
  onPick: (p: LatLng) => void;
  disabled?: boolean;
}) {
  return (
    <div className="h-80 w-full overflow-hidden rounded-md border border-border">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer {...gaodeBase} />
        <ClickCapture onPick={onPick} disabled={disabled} />
        {selected && (
          <CircleMarker
            center={[selected.lat, selected.lng]}
            radius={7}
            pathOptions={{ color: "#6d5efc", fillColor: "#6d5efc", fillOpacity: 0.6 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
