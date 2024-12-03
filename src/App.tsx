/* eslint-disable @typescript-eslint/no-explicit-any */
import "./App.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";

import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { StructRowProxy } from "apache-arrow";
import { MapWithOllamaModel } from "./components/MapWithOllamaModel";

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

type MyDuckDBTableColumn = {
  column_name: string;
  column_type: string;
  null: string;
  key: string | null;
  default: string | null;
  extra: string | null;
};

type MyDuckDBTableSchema = {
  tableName: string;
  columns: MyDuckDBTableColumn[];
};

function App() {
  const [duckdbInitialized, setDuckDBInitialized] = useState(false);
  const [duckdbLoaded, setDuckDBLoaded] = useState(false);
  const [myDuckDB, setMyDuckDB] = useState<duckdb.AsyncDuckDB | null>(null);
  const [summaryOfTableSchemes, setSummaryOfTableSchemes] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    // get table schema
    const doit = async () => {
      if (!myDuckDB || !duckdbLoaded) {
        return;
      }
      const conn = await myDuckDB.connect();
      const result1 = await conn.query(`
        SHOW;
      `);
      const resultRows1: StructRowProxy<any>[] = result1.toArray();
      const newTableSchemes: MyDuckDBTableSchema[] = [];
      for (const row1 of resultRows1) {
        const table = row1.toJSON();
        const tableName = table.name as string;
        const result2 = await conn.query(`
          DESCRIBE TABLE ${tableName};
        `);
        const resultRows2: StructRowProxy<any>[] = result2.toArray();
        newTableSchemes.push({
          tableName: tableName,
          columns: resultRows2.map((row) =>
            row.toJSON()
          ) as MyDuckDBTableColumn[],
        });
      }
      const summaryOfTableSchemes =
        "Summary of tables:" +
        newTableSchemes.map((tableScheme) => {
          return `\n${tableScheme.tableName}:\n${tableScheme.columns
            .map((column) => {
              return `  ${column.column_name}: ${column.column_type}`;
            })
            .join("\n")}`;
        });
      setSummaryOfTableSchemes(summaryOfTableSchemes);
    };
    doit();
  }, [duckdbLoaded, myDuckDB]);

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
        ["gemma2:2b", "llama3.2:1b"].map((modelName) => (
          <div
            key={modelName}
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
              {modelName}
            </div>
            <MapWithOllamaModel
              db={myDuckDB}
              summaryOfTableSchemes={summaryOfTableSchemes!}
              modelName="llama3.2:1b"
            />
          </div>
        ))}
    </div>
  );
}

export default App;
