require("dotenv").config();

const { readFileSync } = require("node:fs");
const { Document } = require("@langchain/core/documents");
const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

async function loadPdfPages(filePath) {
  const parser = new PDFParse({
    data: new Uint8Array(readFileSync(filePath)),
  });

  try {
    const { pages } = await parser.getText();
    return pages.map(
      (page) =>
        new Document({
          pageContent: page.text,
          metadata: { source: filePath, page: page.num - 1 },
        })
    );
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const pages = await loadPdfPages("./nodejs.pdf");
  console.log(`Loaded ${pages.length} pages.`);

  // Split pages into smaller chunks for better retrieval
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await splitter.splitDocuments(pages);
  console.log(`Split into ${docs.length} chunks.`);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
  });



const vectorStore = new QdrantVectorStore(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "nodejs-docs",
});

const BATCH_SIZE = 20;

for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  await vectorStore.addDocuments(docs.slice(i, i + BATCH_SIZE));
  console.log(`Indexed ${Math.min(i + BATCH_SIZE, docs.length)} / ${docs.length}`);
  await new Promise((r) => setTimeout(r, 15000));
}



  console.log("Documents indexed successfully.");
}

main().catch((err) => {
  console.error("Indexing failed:", err);
  process.exit(1);
});