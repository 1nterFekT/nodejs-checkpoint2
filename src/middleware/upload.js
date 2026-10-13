import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.resolve(currentDir, "../../uploads/products");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },

    filename: (_req, file, cb) => {
        const extension = file.mimetype === "image/png" ? ".png" : ".jpg";

        cb(null, `${randomUUID()}${extension}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Разрешены только изображения JPEG и PNG"));
    }

    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
    },
});
