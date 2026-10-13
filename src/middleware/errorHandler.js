import multer from "multer";

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "Размер файла не должен превышать 2 МБ",
                details: [
                    {
                        field: "image",
                        message: "Превышен максимальный размер файла",
                    },
                ],
            });
        }

        return res.status(400).json({
            message: "Ошибка загрузки файла",
            details: [{ field: "image", message: err.message }],
        });
    }

    if (err.message === "Разрешены только изображения JPEG и PNG") {
        return res.status(400).json({
            message: "Ошибка загрузки файла",
            details: [{ field: "image", message: err.message }],
        });
    }

    console.error(err);

    res.status(500).json({
        message: "Внутренняя ошибка сервера",
    });
}
