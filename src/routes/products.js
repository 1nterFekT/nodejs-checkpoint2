import { Router } from "express";
import Joi from "joi";
import fs from "node:fs/promises";

import { PRODUCT_CATEGORIES } from "../config/index.js";
import { validate } from "../middleware/validate.js";
import { upload, uploadsDir } from "../middleware/upload.js";

const router = Router();

const products = [];
let nextId = 1;

const productFields = {
    name: Joi.string().trim().min(2).max(100),
    price: Joi.number().positive(),
    category: Joi.string().valid(...PRODUCT_CATEGORIES),
    stock: Joi.number().integer().min(0),
    description: Joi.string().max(500).allow(""),
};

const createProductSchema = Joi.object({
    name: productFields.name.required(),
    price: productFields.price.required(),
    category: productFields.category.required(),
    stock: productFields.stock.default(0),
    description: productFields.description.optional(),
}).unknown(false);

const replaceProductSchema = createProductSchema;

const patchProductSchema = Joi.object(productFields).min(1).unknown(false);

const productIdSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
}).unknown(false);

const listQuerySchema = Joi.object({
    category: productFields.category.optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
})
    .custom((value, helpers) => {
        if (
            value.minPrice !== undefined &&
            value.maxPrice !== undefined &&
            value.minPrice > value.maxPrice
        ) {
            return helpers.error("any.invalid");
        }

        return value;
    }, "price range validation")
    .messages({
        "any.invalid": "minPrice не может быть больше maxPrice",
    })
    .unknown(false);

router.get("/", validate(listQuerySchema, "query"), (req, res) => {
    const { category, minPrice, maxPrice, page, limit } = req.validatedQuery;

    let result = [...products];

    if (category) {
        result = result.filter((product) => product.category === category);
    }

    if (minPrice !== undefined) {
        result = result.filter((product) => product.price >= minPrice);
    }

    if (maxPrice !== undefined) {
        result = result.filter((product) => product.price <= maxPrice);
    }

    const total = result.length;
    const start = (page - 1) * limit;

    result = result.slice(start, start + limit);

    res.json({
        data: result,
        total,
        page,
        limit,
    });
});

router.get("/:id", validate(productIdSchema, "params"), (req, res) => {
    const product = products.find((item) => item.id === Number(req.params.id));

    if (!product) {
        return res.status(404).json({
            message: "Товар не найден",
        });
    }

    res.json(product);
});

router.post("/", validate(createProductSchema), (req, res) => {
    const product = {
        id: nextId++,
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        stock: req.body.stock,
        ...(req.body.description !== undefined
            ? { description: req.body.description }
            : {}),
        createdAt: new Date().toISOString(),
    };

    products.push(product);

    res.status(201).json(product);
});

router.put(
    "/:id",
    validate(productIdSchema, "params"),
    validate(replaceProductSchema),
    (req, res) => {
        const index = products.findIndex(
            (item) => item.id === Number(req.params.id),
        );

        if (index === -1) {
            return res.status(404).json({
                message: "Товар не найден",
            });
        }

        const current = products[index];

        products[index] = {
            id: current.id,
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            stock: req.body.stock,
            ...(req.body.description !== undefined
                ? { description: req.body.description }
                : {}),
            ...(current.imageUrl ? { imageUrl: current.imageUrl } : {}),
            createdAt: current.createdAt,
        };

        res.json(products[index]);
    },
);

router.patch(
    "/:id",
    validate(productIdSchema, "params"),
    validate(patchProductSchema),
    (req, res) => {
        const product = products.find(
            (item) => item.id === Number(req.params.id),
        );

        if (!product) {
            return res.status(404).json({
                message: "Товар не найден",
            });
        }

        Object.assign(product, req.body);

        res.json(product);
    },
);

router.delete("/:id", validate(productIdSchema, "params"), async (req, res) => {
    const index = products.findIndex(
        (item) => item.id === Number(req.params.id),
    );

    if (index === -1) {
        return res.status(404).json({
            message: "Товар не найден",
        });
    }

    const [product] = products.splice(index, 1);

    if (product.imageUrl) {
        const filename = product.imageUrl.split("/").pop();

        if (filename && filename === product.imageUrl.split("/").at(-1)) {
            try {
                await fs.unlink(`${uploadsDir}/${filename}`);
            } catch (err) {
                if (err.code !== "ENOENT") {
                    console.error("Не удалось удалить изображение:", err);
                }
            }
        }
    }

    res.status(204).end();
});

router.post(
    "/:id/image",
    validate(productIdSchema, "params"),
    (req, res, next) => {
        const product = products.find(
            (item) => item.id === Number(req.params.id),
        );

        if (!product) {
            return res.status(404).json({
                message: "Товар не найден",
            });
        }

        next();
    },
    upload.single("image"),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                message: "Необходимо передать изображение",
                details: [
                    {
                        field: "image",
                        message: "Файл не был загружен",
                    },
                ],
            });
        }

        const product = products.find(
            (item) => item.id === Number(req.params.id),
        );

        const previousImage = product.imageUrl;

        product.imageUrl = `/uploads/products/${req.file.filename}`;

        if (previousImage) {
            const oldFilename = previousImage.split("/").pop();

            if (oldFilename) {
                fs.unlink(`${uploadsDir}/${oldFilename}`).catch((err) => {
                    if (err.code !== "ENOENT") {
                        console.error(
                            "Не удалось удалить старое изображение:",
                            err,
                        );
                    }
                });
            }
        }

        res.status(200).json(product);
    },
);

export default router;
