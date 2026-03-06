const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Optional: Test the connection to make sure it works
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the MySQL database!');

        // Initialize users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table ready.');

        // Initialize messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Messages table ready.');

        // Initialize games table
        await connection.query('DROP TABLE IF EXISTS games');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS games (
                id INT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                genre VARCHAR(100),
                thumbnail VARCHAR(500),
                game_url VARCHAR(500),
                release_date DATE,
                is_popular BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('Games table ready.');

        // Seed games since we dropped it
        console.log("Seeding massive games library from GameDistribution API...");
        try {
            const response = await fetch('https://catalog.api.gamedistribution.com/api/v2.0/rss/All/?collection=all&categories=All&type=all&amount=250&page=1&format=json');
            const gamesData = await response.json();

            for (let i = 0; i < gamesData.length; i++) {
                const g = gamesData[i];
                const genre = (g.Category && g.Category.length > 0) ? g.Category[0].trim() : "Casual";
                const isPopular = i < 12; // Top 12 are marked as popular
                const gameUrl = g.Url || '#';
                const thumb = (g.Asset && g.Asset.length > 0) ? g.Asset[0] : '';

                // GameDistribution does not reliably provide release_date in JS timestamp format here, so we leave it null 
                // but the DB handles it because the column allows NULL. Default query orders by release_date DESC so NULL is fine.
                await connection.query(
                    'INSERT IGNORE INTO games (id, title, description, category, genre, thumbnail, game_url, release_date, is_popular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [i + 1, g.Title || 'Unknown', g.Description || '', genre, genre, thumb, gameUrl, null, isPopular]
                );
            }
            console.log(`Successfully seeded ${gamesData.length} playable HTML5 games into the database!`);
        } catch (seedErr) {
            console.error("Failed to seed games API:", seedErr);
        }

        connection.release(); // Always release the connection back to the pool
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
}

testConnection();

// Export the pool so you can use it in other files
module.exports = pool;
