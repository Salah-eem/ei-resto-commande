"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

type Props = {
  restaurantPos: [number, number];
  selectedOrder: any;
  routeCoords: [number, number][];
};

function FitRouteBounds({ routeCoords }: { routeCoords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords.length > 1) {
      map.fitBounds(routeCoords);
    }
  }, [routeCoords, map]);
  return null;
}

export default function DeliveryMap({
  restaurantPos,
  selectedOrder,
  routeCoords,
}: Props) {
  return (
    <MapContainer
      center={
        selectedOrder && routeCoords.length > 1
          ? [
              (restaurantPos[0] + selectedOrder.deliveryAddress.lat) / 2,
              (restaurantPos[1] + selectedOrder.deliveryAddress.lng) / 2,
            ]
          : [restaurantPos[0], restaurantPos[1]]
      }
      zoom={selectedOrder && routeCoords.length > 1 ? 13 : 16}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <Marker
        position={restaurantPos}
        icon={
          new L.Icon({
            iconUrl: "/logo.png",
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })
        }
      >
        <Popup>Restaurant</Popup>
      </Marker>
      {selectedOrder && (
        <Marker
          position={[
            selectedOrder.deliveryAddress.lat,
            selectedOrder.deliveryAddress.lng,
          ]}
        >
          <Popup>Livraison</Popup>
        </Marker>
      )}
      {selectedOrder && routeCoords.length > 1 && (
        <>
          <Polyline positions={routeCoords} weight={4} color="#1976d2" />
          <FitRouteBounds routeCoords={routeCoords} />
        </>
      )}
    </MapContainer>
  );
}
