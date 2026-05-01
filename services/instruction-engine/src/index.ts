import app from "./app";

const PORT = process.env.INSTRUCTION_ENGINE_PORT ?? 3002;

app.listen(PORT, () => {
  console.log(`[instruction-engine] Running on http://localhost:${PORT}`);
});
