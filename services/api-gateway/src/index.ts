import "dotenv/config";
import app from "./app";

const PORT = process.env.API_GATEWAY_PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`[api-gateway] Running on http://localhost:${PORT}`);
});
