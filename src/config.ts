// The only place that reads process.env. Values are read when asked for,
// so a script that doesn't need Voyage doesn't need a Voyage key.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export type EmbedderName = "voyage" | "fake";

export function embedderName(): EmbedderName {
  const value = process.env.EMBEDDER ?? "voyage";
  if (value !== "voyage" && value !== "fake") {
    throw new Error(`EMBEDDER must be "voyage" or "fake", got "${value}".`);
  }
  return value;
}

export function voyageConfig() {
  return {
    apiKey: required("VOYAGE_API_KEY"),
    model: process.env.VOYAGE_MODEL ?? "voyage-4",
  };
}
