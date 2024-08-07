// controllers/UsersController.js
const crypto = require('crypto');
const dbClient = require('../utils/db');

const postNew = async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
        return res.status(400).json({ error: 'Missing password' });
    }

    try {
        // Check if email already exists
        const existingUser = await dbClient.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Hash the password using SHA1
        const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

        // Create a new user
        const newUser = {
            email,
            password: hashedPassword,
        };

        const result = await dbClient.collection('users').insertOne(newUser);
        const userId = result.insertedId;

        // Respond with the new user
        res.status(201).json({
            id: userId,
            email: newUser.email,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { postNew };
