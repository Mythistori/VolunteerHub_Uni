const argon2 = require("argon2");
function validateRegistration(name, email, password) {
    async function hashPassword(password) {
    return argon2.hash(password);
    }
    async function verifyPassword(passwordHash, password) {
    return argon2.verify(passwordHash, password);
    }
    if (typeof name !== "string" || name.trim() === "") {
        return "Name is required.";
    }

    if (typeof email !== "string" || !email.includes("@")) {
        return "Enter a valid email address.";
    }

    if (typeof password !== "string" || password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    return null;
}

async function hashPassword(password) {
    return argon2.hash(password);
}

async function verifyPassword(passwordHash, password) {
    return argon2.verify(passwordHash, password);
}

async function prepareRegistration(name, email, password) {
    const error = validateRegistration(name, email, password);

    if (error) {
        return { error };
    }

    const passwordHash = await hashPassword(password);

    return {
        user: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password_hash: passwordHash,
            role: "student"
        }
    };
}

module.exports = {
    validateRegistration,
    hashPassword,
    verifyPassword,
    prepareRegistration
};