"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };

type Props = {
  initialLat?: number | null;
  initialLng?: number | null;
  onPick: (lat: number, lng: number, address?: string) => void;
};

async function reverseAddress(lat: number, lng: number) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { display_name?: string };
    return String(data.display_name || "");
  } catch {
    return "";
  }
}

export default function ChatLocationMapPicker({
  initialLat,
  initialLng,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const goToCurrentRef = useRef<() => void>(() => {});
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked] = useState<{ lat: number; lng: number; address: string } | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng, address: "" }
      : null
  );

  onPickRef.current = onPick;

  const startLat =
    Number.isFinite(Number(initialLat)) ? Number(initialLat) : DEFAULT_CENTER.lat;
  const startLng =
    Number.isFinite(Number(initialLng)) ? Number(initialLng) : DEFAULT_CENTER.lng;

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const leaflet = await import("leaflet");
      if (typeof document !== "undefined") {
        const href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        if (!document.querySelector(`link[data-leaflet-css="1"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.setAttribute("data-leaflet-css", "1");
          document.head.appendChild(link);
        }
      }
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = leaflet.default;

      const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
      delete proto._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [startLat, startLng],
        15
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

      const applyPick = async (nextLat: number, nextLng: number) => {
        marker.setLatLng([nextLat, nextLng]);
        const address = await reverseAddress(nextLat, nextLng);
        setPicked({ lat: nextLat, lng: nextLng, address });
        onPickRef.current(nextLat, nextLng, address);
      };

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        void applyPick(pos.lat, pos.lng);
      });
      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        void applyPick(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      const LocateControl = L.Control.extend({
        onAdd() {
          const wrap = L.DomUtil.create("div", "leaflet-bar");
          const btn = L.DomUtil.create("a", "", wrap);
          btn.href = "#";
          btn.title = "Current location";
          btn.setAttribute("role", "button");
          btn.setAttribute("aria-label", "Current location");
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1c1610" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>';
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
          btn.style.width = "34px";
          btn.style.height = "34px";
          L.DomEvent.disableClickPropagation(wrap);
          L.DomEvent.on(btn, "click", (event: Event) => {
            L.DomEvent.preventDefault(event);
            goToCurrentRef.current();
          });
          return wrap;
        },
      });
      map.addControl(new LocateControl({ position: "topleft" }));

      window.setTimeout(() => map.invalidateSize(), 80);

      // Seed first pick so Send works even before another click
      void applyPick(startLat, startLng);
    };

    void start();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; later moves happen via user interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToCurrent = () => {
    if (!navigator.geolocation) {
      setSearchError("This browser cannot share location.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        mapRef.current?.setView([nextLat, nextLng], 17);
        markerRef.current?.setLatLng([nextLat, nextLng]);
        void reverseAddress(nextLat, nextLng).then((address) => {
          setPicked({ lat: nextLat, lng: nextLng, address });
          onPickRef.current(nextLat, nextLng, address);
          setLocating(false);
        });
      },
      (err) => {
        setSearchError(
          err.code === 1
            ? "Allow location access to use current location."
            : "Could not read current location. Search or tap the map."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 8000 }
    );
  };
  goToCurrentRef.current = goToCurrent;

  const searchPlace = async () => {
    const text = query.trim();
    if (!text) return;
    setSearching(true);
    setSearchError("");
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", text);
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const rows = (await res.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;
      const hit = rows[0];
      const nextLat = Number(hit?.lat);
      const nextLng = Number(hit?.lon);
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
        setSearchError("No place found. Try a fuller address.");
        return;
      }
      const address = String(hit?.display_name || "");
      setPicked({ lat: nextLat, lng: nextLng, address });
      onPickRef.current(nextLat, nextLng, address);
      mapRef.current?.setView([nextLat, nextLng], 17);
      markerRef.current?.setLatLng([nextLat, nextLng]);
    } catch {
      setSearchError("Could not search the map right now.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchPlace();
            }
          }}
          placeholder="Search area, landmark, or city"
          className="h-10 flex-1 rounded-xl border border-[#eadfcf] bg-[#fbf8f3] px-3 text-sm text-[#1c1610] outline-none focus:border-[#c4a574] dark:border-[#3a342c] dark:bg-[#161411] dark:text-[#f3ece2]"
        />
        <button
          type="button"
          onClick={() => void searchPlace()}
          disabled={searching}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#eadfcf] bg-white px-3 text-sm font-semibold text-[#1c1610] disabled:opacity-60 dark:border-[#3a342c] dark:bg-[#221c17] dark:text-[#f3ece2]"
        >
          {searching ? "…" : "Search"}
        </button>
        <button
          type="button"
          onClick={goToCurrent}
          disabled={locating}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl !bg-[#1c1610] px-3 text-sm font-semibold !text-white disabled:opacity-60"
        >
          {locating ? "Finding…" : "My location"}
        </button>
      </div>
      {searchError ? <p className="text-xs text-red-600">{searchError}</p> : null}
      <p className="text-[11px] text-[#8a7b68]">
        Tap the map or drag the pin to choose a place
        {picked ? ` · ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : ""}
      </p>
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-2xl border border-[#eadfcf] dark:border-[#3a342c]"
      />
      {picked?.address ? (
        <p className="line-clamp-2 text-[11px] leading-relaxed text-[#6b5f52] dark:text-[#b0a89d]">
          {picked.address}
        </p>
      ) : null}
    </div>
  );
}
