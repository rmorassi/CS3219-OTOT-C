// Libraries used
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import my files
const User = require("./model/user");
require("./config/database").connect();
const authenticate = require("./middleware/authenticate");

// Configure app
const app = express();
app.use(express.json({ limit: "50mb" }));

// ==================== ROUTING ====================

// Register user
app.post("/register", async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        // Validate user input
        if (!(email && password && first_name && last_name)) {
            return res.status(400).send("Email, Password, First Name, or Last Name was missing...");
        }

        // Check if user already exists
        if (await User.findOne({ email })) {
            return res.status(409).send("User Already Exists. Cannot create a new account with the same email");
        }

        // Create user in database
        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(),                 // Sanitize: convert email to lowercase
            password: await bcrypt.hash(password, 10),  // Encrypt password
        });

        // Create new token
        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
                expiresIn: "1h",
            }
        );
        user.token = token; // save

        return res.status(201).json(user);
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate user input
        if (!(email && password)) {
            return res.status(400).send("Email or Password was missing...");
        }

        // Find the user in database
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {  // check if password matches
            // Create new token
            const token = jwt.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "1h",
                }
            );
            user.token = token;  // save

            return res.status(200).json(user);
        }
        return res.status(400).send("Invalid Credentials!");
    } catch (err) {
        console.log(err);
    }
});

// Store the set of whitelisted users (tokens)
const whitelistedTokens = new Set();

// Whitelist a user
app.get("/whitelistMe", authenticate, (req, res) => {
    try {
        const token = req.headers["x-access-token"];

        whitelistedTokens.add(token);

        return res.status(200).send("Whitelisted");
    } catch (err) {
        console.log(err);
    }
});

// Display normal welcome page
app.get("/welcome", authenticate, (req, res) => {
    return res.status(200).send("Welcome 🙌 ");
});

// Display welcome page only to authorised users
app.get("/welcomeSecret", authenticate, (req, res) => {
    const token = req.headers["x-access-token"];

    if (!whitelistedTokens.has(token)) {
        return res.status(403).send("Unauthorized token");
    }
    return res.status(200).send("Welcome to the secret website 🙌");
});

// This should be the last route else any after it won't work
app.use("*", (req, res) => {
    return res.status(404).send("Dont lurk around...");
});

module.exports = app;
