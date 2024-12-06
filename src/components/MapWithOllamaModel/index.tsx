import * as duckdb from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";
import { MapWithDuckDBAndQuery } from "../MapWithDuckDBAndQuery";
import { OllamaModel } from "../../vite-env";

export const MapWithOllamaModel: React.FC<{
  db: duckdb.AsyncDuckDB;
  model: OllamaModel;
}> = ({ db, model }) => {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<
    string | null
  >(`SELECT name as name, ST_DISTANCE(geom, (SELECT geom FROM countries WHERE name = 'Japan')) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name != 'Japan'
ORDER BY value ASC
LIMIT 1`);

  return query ? (
    <MapWithDuckDBAndQuery db={db} query={query} />
  ) : (
    <div>Loading...</div>
  );
};
