import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import resourceRoutes from "./routes/resourceRoutes";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main Resource Routing mapping cleanly
app.use("/api/resources", resourceRoutes);

// Fallback 404 Route handling dynamically missing endpoints
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint Not Found" });
});

// Structural Unified Execution Error Layer seamlessly bypassing execution crashing
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
