import { Database } from "duckdb-async";

import { ChatOllama } from "@langchain/ollama";

const db = await Database.create(":memory:");
await db.exec(`INSTALL json; LOAD json;`);
await db.exec(`INSTALL spatial; LOAD spatial;`);
await db.exec(`
  CREATE TABLE countries AS SELECT * FROM ST_READ('public/ne_10m_admin_0_countries.geojson')
`);

const conn = await db.connect();
const result1 = await conn.all(`SHOW;`);
let summaryOfSchemas = "";
for (const row1 of result1) {
  const tableName = row1.name;
  const result2 = await conn.all(`DESCRIBE TABLE ${tableName};`);
  summaryOfSchemas += `${tableName}:\n`;
  for (const row2 of result2) {
    summaryOfSchemas += `  ${row2.column_name}: ${row2.column_type}\n`;
  }
}

let countriesNameList = "";
const result3 = await conn.all(`SELECT name FROM countries;`);
for (const row3 of result3) {
  countriesNameList += `  ${row3.name}\n`;
}

const generateGeospatialQuiz = async () => {
  const model = new ChatOllama({
    model: "qwen2.5:7b",
    temperature: 0.0,
    repeatPenalty: 1.2,
    numCtx: 2048,
    numPredict: 1024,
    stop: ["\n\n"],
  });
  const prompt = `You are a database analyst specializing in geospatial information.
Your task is to generate SQL database questions based on a given database table schema.

**Your rules:**
- Reply with a list of questions **only**. Do not include any other content in your response.
- Focus exclusively on geospatial information. Ignore fields unrelated to geospatial data, such as population or GDP.
- Always write the questions in a Markdown list format.
- Provide exactly 10 questions in each response.
- Questions must be **unique** and not copy examples or previously provided content.
- Avoid repeating, rephrasing, or directly using the examples given below. Use them only as inspiration.

**Input Information:**
- **Table Schema:**  
${summaryOfSchemas}

- **Names of Countries:**  
${countriesNameList}

**Examples of questions (do NOT copy or reuse these):**
- What is the total area of each country?
- Which countries share a border with China?
- What is the length of the coastline for each country?
- Which countries are within a 500km radius of Australia?
- List all countries that have no neighboring countries.
- How many countries share borders with more than five other countries?
- Identify the country with the longest land border with Russia.
- Which countries have land borders with both France and Spain?
- What are the coordinates of the geographical center of each country?
- What is the largest island within the territory of each country?

**Important:** 
- Do NOT reuse, rephrase, or modify the example questions. 
- Your task is to create completely new and original questions inspired by the provided schema and country list.

Now, generate 10 unique and original database questions based on the given schema and country list, strictly following the rules above.
`;

  const response = await model.invoke(prompt);
  console.log(response.content);
};

await generateGeospatialQuiz();
