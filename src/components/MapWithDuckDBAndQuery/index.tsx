/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import Map, { MapProvider, MapRef } from "react-map-gl/maplibre";
import { FeatureCollection, Feature } from "geojson";

import * as duckdb from "@duckdb/duckdb-wasm";
import { StructRowProxy } from "apache-arrow";
import { ResultsSourceLayer } from "../ResultsSourceLayer";
import { fitBoundsToGeoJson } from "../../lib/maplibre/fitBoundsToGeoJson";

export const MapWithDuckDBAndQuery: React.FC<{
  db: duckdb.AsyncDuckDB;
  query: string;
}> = ({ db, query }) => {
  const mapRef = useRef<MapRef | null>(null);
  const [results, setResults] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    const doit = async () => {
      if (!query) {
        return;
      }
      const conn = await db.connect();
      const results = await conn.query(query);
      const resultRows: StructRowProxy<any>[] = results.toArray();
      if (resultRows.length === 0) {
        setResults(null);
        return;
      }
      // geojsonにする
      const resultFeatures: Feature[] = resultRows.map((row) => ({
        type: "Feature",
        properties: { name: row.name, value: row.value },
        geometry: JSON.parse(row.geom),
      }));
      const resultGeoJson: FeatureCollection = {
        type: "FeatureCollection",
        features: resultFeatures,
      };
      setResults(resultGeoJson);
      fitBoundsToGeoJson(mapRef, resultGeoJson, {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100,
      });
      await conn.close();
    };
    doit();
  }, [db, query]);

  return (
    <MapProvider>
      <Map
        ref={mapRef}
        style={{ width: "100vw", height: "100vh" }}
        initialViewState={{
          latitude: 0,
          longitude: 0,
          zoom: 1,
        }}
        mapStyle="https://tile.openstreetmap.jp/styles/osm-bright/style.json"
      >
        {results && <ResultsSourceLayer results={results} />}
      </Map>
    </MapProvider>
  );
};
