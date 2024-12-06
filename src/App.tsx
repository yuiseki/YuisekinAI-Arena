import "./App.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";

import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { MapWithOllamaModel } from "./components/MapWithOllamaModel";
import { ollamaModels } from "./lib/ollama/ollamaModels";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
};

const initDuckDB = async (
  setMyDuckDB: React.Dispatch<React.SetStateAction<duckdb.AsyncDuckDB | null>>
) => {
  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  // Instantiate the asynchronous version of DuckDB-wasm
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  setMyDuckDB(db);
  const c = await db.connect();
  await c.query(`
    INSTALL json;
    INSTALL spatial;
  `);
};

function App() {
  const [duckdbInitialized, setDuckDBInitialized] = useState(false);
  const [duckdbLoaded, setDuckDBLoaded] = useState(false);
  const [myDuckDB, setMyDuckDB] = useState<duckdb.AsyncDuckDB | null>(null);

  // initialize DuckDB
  useEffect(() => {
    if (!duckdbInitialized) {
      initDuckDB(setMyDuckDB);
      setDuckDBInitialized(true);
    }
  }, [duckdbInitialized]);

  // load all fields of countriesGeoJSON into DuckDB use ST_READ
  useEffect(() => {
    const doit = async () => {
      if (!myDuckDB) {
        return;
      }
      if (!duckdbInitialized) {
        return;
      }
      const c = await myDuckDB.connect();
      await c.query(`
        LOAD json;
        LOAD spatial;
      `);
      await c.query(
        "CREATE TABLE countries AS SELECT * FROM ST_READ('http://localhost:5173/ne_10m_admin_0_countries.geojson')"
      );
      setDuckDBLoaded(true);
    };
    doit();
  }, [duckdbInitialized, myDuckDB]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        gap: "10px",
      }}
    >
      {myDuckDB &&
        duckdbLoaded &&
        ollamaModels.map((model) => (
          <div
            key={model.modelName}
            style={{
              display: "flex",
              width: "100vw",
              height: "20vh",
            }}
          >
            <div
              style={{
                marginRight: "10px",
              }}
            >
              {model.modelName}
            </div>
            <MapWithOllamaModel db={myDuckDB} model={model} />
          </div>
        ))}
    </div>
  );
}

export default App;
