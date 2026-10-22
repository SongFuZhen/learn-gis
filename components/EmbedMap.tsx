"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletStatic"), { ssr: false });

export default function EmbedMap({
  lat,
  lng,
  zoom = 4,
  label,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
}) {
  return (
    <figure className="my-5">
      <div className="h-72 w-full overflow-hidden rounded-md border border-border">
        <LeafletMap lat={lat} lng={lng} zoom={zoom} />
      </div>
      {label ? (
        <figcaption className="mt-2 text-[12px] text-foreground-tertiary">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
