require("dotenv").config();

const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { QdrantVectorStore } = require("@langchain/qdrant");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

async function chat() {
  const userQuery = "What is the event loop in Node.js?";

  // Same embedding model used for indexing
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      collectionName: "nodejs-docs",
    }
  );

  const vectorSearcher = vectorStore.asRetriever({ k: 3 });
  const relevantChunks = await vectorSearcher.invoke(userQuery);

  const SYSTEM_PROMPT = `
    You are an AI assistant who answers questions about Node.js based only on
    the context below, which comes from a PDF file with content and page numbers.

    If the answer is not in the context, say "I don't know."

    Context:
    ${JSON.stringify(relevantChunks)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: userQuery,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  console.log(`> ${response.text}`);
}

chat().catch(console.error);