import * as duckdb from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";
import { MapWithDuckDBAndQuery } from "../MapWithDuckDBAndQuery";

const queriesWithQuestions = [
  {
    question: "世界で一番人口の多い国は？",
    query: `
SELECT name as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
ORDER BY value DESC
LIMIT 1
    `,
  },
  {
    question: "世界で一番人口の少ない国は？",
    query: `
SELECT name as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
ORDER BY value ASC
LIMIT 1
    `,
  },
  {
    question: "日本より人口が多い国は？",
    query: `
SELECT name as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE POP_EST >= (
  SELECT POP_EST
  FROM countries
  WHERE name = 'Japan'
)
    `,
  },
  {
    question: "南極より人口が少ない国は？",
    query: `
SELECT name as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE POP_EST <= (
  SELECT POP_EST
  FROM countries
  WHERE name = 'Antarctica'
)
    `,
  },
  {
    question: "南極の次に面積の広い国は？",
    query: `
SELECT name as name, ST_AREA(geom) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name != 'Antarctica'
ORDER BY value DESC
LIMIT 1
    `,
  },
  {
    question: "日本の人口は？",
    query: `
SELECT '日本の人口' as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name = 'Japan'
    `,
  },
  {
    question: "日本とブラジルはどちらが面積が広い？",
    query: `
SELECT name as name, ST_AREA(geom) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name IN ('Japan', 'Brazil')
ORDER BY value DESC
LIMIT 1
    `,
  },
  {
    question: "台湾と北朝鮮どちらが人口が多い？",
    query: `
SELECT name as name, POP_EST as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name IN ('Taiwan', 'North Korea')
ORDER BY value DESC
LIMIT 1
    `,
  },
  {
    question: "日本とブラジルの距離は？",
    query: `
SELECT 
'日本とブラジルの距離' as name,
ST_Distance(
  (SELECT geom FROM countries WHERE name = 'Japan'),
  (SELECT geom FROM countries WHERE name = 'Brazil')
) as value,
ST_AsGeoJSON(
  ST_MakeLine(
    ST_Centroid((SELECT geom FROM countries WHERE name = 'Japan')),
    ST_Centroid((SELECT geom FROM countries WHERE name = 'Brazil'))
  )
) as geom
FROM countries
WHERE name IN ('Japan', 'Brazil')
    `,
  },
];

/**
  curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "What is the most populous country in the world?",
}'
*/

export const MapWithOllamaModel: React.FC<{
  db: duckdb.AsyncDuckDB;
  summaryOfTableSchemes: string;
  modelName: string;
}> = ({ db, summaryOfTableSchemes, modelName }) => {
  const [query, setQuery] = useState<string | null>(null);

  useEffect(() => {
    const doit = async () => {
      setQuery(null);

      const prompt = `You are an expert of PostgreSQL and PostGIS. You output the best PostgreSQL query based on given table schema and input text.

You will always reply according to the following rules:
- Output valid PostgreSQL query.
- The query MUST be return name, value and geom columns.
- The query MUST be enclosed by three backticks on new lines, denoting that it is a code block.

### Table Schema: ###
${summaryOfTableSchemes}


### Examples: ###
${queriesWithQuestions
  .map(
    (q) => `
${q.question}
${q.query}
`
  )
  .join("\n")}

### Input text: ###
What is the most populous country in the world?
`;
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stream: false,
          model: modelName,
          prompt,
        }),
      });
      const resJson = await res.json();
      const regex = /```sql([\s\S]*?)```/g;
      const newQuery = resJson.response
        .match(regex)[0]
        .replace("```sql", "")
        .replace("```", "");
      console.log(newQuery);
      setQuery(newQuery);
    };

    doit();
  }, [summaryOfTableSchemes, modelName]);

  return query ? (
    <MapWithDuckDBAndQuery db={db} query={query} />
  ) : (
    <div>Loading...</div>
  );
};
