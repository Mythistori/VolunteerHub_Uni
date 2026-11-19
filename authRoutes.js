const jwt = require("jsonwebtoken");
const express = require("express");

const { prepareRegistration, verifyPassword } = require("./auth");



function createAuthRouter(createUser, findUserByEmail) {
    const router = express.Router();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
    }
    router.post("/register", async (req, res, next) => {
        try {
            const { name, email, password } = req.body || {};
            const result = await prepareRegistration(name, email, password);

            if (result.error) {
                return res.status(400).json({ error: result.error });
            }

            const user = await createUser(result.user);

            if (user === null) {
                return res.status(409).json({ error: "Email is already registered." });
            }

            return res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            });
        } catch (error) {
            next(error);
        }
    });
    router.post("/login", async (req, res, next) => {
        try {
            const { email, password } = req.body || {};

            if (typeof email !== "string" || typeof password !== "string") {
                return res.status(400).json({ error: "Enter your email and password." });
            }

            const user = await findUserByEmail(email.trim().toLowerCase());

            if (!user || !(await verifyPassword(user.password_hash, password))) {
                return res.status(401).json({ error: "Invalid email or password." });
            }

            const token = jwt.sign({}, jwtSecret, {
                algorithm: "HS256",
                subject: String(user.id),
                expiresIn: "1h"
            });
            return res.json({ token });

        } catch (error) {
            next(error);
        }
    });
    router.get("/me", (req, res) => {
        const authorization = req.get("Authorization") || "";
        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Token is required." });
        }
        try {
            const token = authorization.slice(7);
            const payload = jwt.verify(token, jwtSecret, {
                algorithms: ["HS256"]
            });
            return res.json({ userId: payload.sub });
        }
        catch {
            return res.status(401).json({ error: "Invalid or expired token." });
        }
    });
    
    
    return router;
}

module.exports = createAuthRouter;