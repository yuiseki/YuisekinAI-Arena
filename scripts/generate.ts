import { Database } from "duckdb-async";

import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ollamaModels } from "../src/lib/ollama/ollamaModels";
import { loadGeospatialSQLGeneratorChain } from "../src/lib/langchain/loadGeospatialSQLGeneratorChain";
import { OllamaModel } from "../src/vite-env";

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

const executeSQL = async (sql: string) => {
  try {
    const result = await conn.all(sql);
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getOllamaModel = async (llmModel: OllamaModel) => {
  const { modelName } = llmModel;
  const model = new ChatOllama({
    model: modelName,
    temperature: 0.0,
    repeatPenalty: 1.1,
    numCtx: 2048,
    numPredict: 128,
    stop: ["\n\n"],
  });
  return model;
};

const generateGeospatialSQL = async (
  llmModel: OllamaModel,
  questionAndAnswer: {
    question: string;
    answers: string[];
  }
) => {
  console.log(`>>>>> ----- ----- ${llmModel.modelName} ----- ----- -----`);
  const llm = await getOllamaModel(llmModel);
  const embeddings = new OllamaEmbeddings({
    model: "snowflake-arctic-embed:22m",
  });
  const chain = await loadGeospatialSQLGeneratorChain({
    llm,
    embeddings,
  });
  const res = await chain.invoke({
    input: questionAndAnswer.question,
    tableSchema: summaryOfSchemas,
  });
  let sql = res.content;
  if (res.content.startsWith("```sql")) {
    sql = res.content.replace("```sql", "").replace("```", "");
  } else {
    sql = res.content.split("```")[1];
  }

  console.log(sql);
  if (sql) {
    const result = await executeSQL(sql);
    if (result) {
      const outputs = result.map((row) => row.name);
      // outputs と answers が一致しているかどうか確認する。順番は問わない
      const output = outputs.sort().join(",");
      const answer = questionAndAnswer.answers.sort().join(",");
      if (output === answer) {
        console.info("Correct SQL generated!");
      } else {
        console.error("Incorrect SQL generated!");
        console.error("Expected:", answer);
        console.error("Actual:", output);
      }
    } else {
      console.error("Invalid SQL generated");
    }
  } else {
    console.error("SQL does not generated");
  }
  console.log(`----- ----- ----- ${llmModel.modelName} ----- ----- <<<<<`);
};

const questionAndAnswerList = [
  {
    question: "Which country is closest to Japan?",
    answers: ["Russia"],
  },
  {
    question: "After Antarctica, which country has the largest area?",
    answers: ["Russia"],
  },
];

for (const llmModel of ollamaModels) {
  // gemma2:2b や qwen2.5:1.5b から 2000000000, 1500000000 というパラメーターサイズを得る
  let modelParamSize;
  if (llmModel.modelName.endsWith("b")) {
    modelParamSize =
      parseFloat(llmModel.modelName.split(":")[1].replace("b", "")) *
      1000000000;
  }
  if (llmModel.modelName.endsWith("m")) {
    modelParamSize =
      parseFloat(llmModel.modelName.split(":")[1].replace("m", "")) * 1000000;
  }
  // 2000000000 よりの大きかったらスキップ
  if (!modelParamSize) {
    continue;
  }
  if (modelParamSize > 2000000000) {
    continue;
  }
  console.log("modelName:", llmModel.modelName);
  for (const questionAndAnswer of questionAndAnswerList) {
    await generateGeospatialSQL(llmModel, questionAndAnswer);
  }
}
