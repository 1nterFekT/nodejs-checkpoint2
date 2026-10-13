import express from "express";

import { PORT } from "./config/index.js";
import { logger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import productsRouter from "./routes/products.js";

const app = express();

app.use(logger);
app.use(express.json());

app.use("/uploads/products", express.static("uploads/products"));

app.use("/api/products", productsRouter);

app.use((req, res) => {
    res.status(404).json({
        message: "Маршрут не найден",
    });
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
