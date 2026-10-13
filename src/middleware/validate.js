export function validate(schema, source = "body") {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            convert: true,
            stripUnknown: false,
        });

        if (error) {
            return res.status(400).json({
                message: "Ошибка валидации",
                details: error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                })),
            });
        }

        if (source === "query") {
            req.validatedQuery = value;
        } else {
            req[source] = value;
        }

        next();
    };
}
