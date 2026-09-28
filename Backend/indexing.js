const { readFileSync } = require("node:fs");
const { Document } = require("@langchain/core/documents");
const { PDFParse } = require("pdf-parse");

// Load pages from a PDF file into LangChain Documents
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
  const filePath = "./nodejs.pdf";
  const docs = await loadPdfPages(filePath);
  console.log(`Loaded ${docs.length} pages.`);
}

main().catch((err) => {
  console.error("Indexing failed:", err);
  process.exit(1);
});