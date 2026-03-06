const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const db = require('./db'); // MySQL connection pool
// --- EventEmitter Assignment Features ---

// Requirement 5: Custom Event Emitter
class TrexorEmitter extends EventEmitter { }
const myEmitter = new TrexorEmitter();

// Requirement 4: newListener Event
// This fires automatically whenever a new listener is dynamically added
myEmitter.on('newListener', (event, listener) => {
    console.log(`[Event System] A new listener was attached for the event: ${event}`);
});

// Requirement 1: One-Time Event Listeners
// This listener will only trigger once, then automatically remove itself
myEmitter.once('serverBoot', () => {
    console.log('[Event System] SUCCESS: Server Boot sequence fired (One-Time Event)');
});

// A standard listener to demonstrate inspection methods
const apiCallListener = (route) => {
    console.log(`[Event System] Tracking API Call to: ${route}`);
};
myEmitter.on('apiCall', apiCallListener);

// Requirement 3: Listeners() Method
// Returns an array of listeners for a specific event
console.log('[Event System] Inspecting with listeners():', myEmitter.listeners('apiCall'));

// Requirement 2: Inspecting Event Listeners
// Returns the exact integer count of listeners attached
console.log(`[Event System] Inspecting with listenerCount(): Total listeners for 'apiCall' is ${myEmitter.listenerCount('apiCall')}`);

// Triggering the one-time event immediately for demonstration
myEmitter.emit('serverBoot');


const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const server = http.createServer(async (req, res) => {
    // Basic CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- Routing Implementation ---
    // Requirement 3: Implement Routing feature using NodeJS

    // Route 1: Serve main HTML, CSS, and JS client side
    if (req.url === '/' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'login.html'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
    else if (req.url === '/home' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
    else if (req.url === '/style.css' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'style.css'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
        });
    }
    else if (req.url === '/app.js' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'app.js'), 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
    }

    // Route 2.5: Get all unique genres
    else if (req.url === '/api/genres' && req.method === 'GET') {
        try {
            const [rows] = await db.query('SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL ORDER BY genre ASC');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rows.map(r => r.genre)));
        } catch (err) {
            console.error("Genres err:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    }

    // Route 2: Read operation on MySQL (Games Gallery)
    // Requirement 1 & 2: Store Your JSON file in Local Host
    // Requirement 2: Perform read operation in the server side
    else if (req.url.startsWith('/api/games') && req.method === 'GET') {
        myEmitter.emit('apiCall', '/api/games'); // Trigger custom event emitter

        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
            const search = parsedUrl.searchParams.get('search') || '';
            const category = parsedUrl.searchParams.get('category') || 'all';
            const sort = parsedUrl.searchParams.get('sort') || 'default';

            let query = "";
            let params = [];

            // "At least 6 games should be shown as default for each genre in home page"
            if (!search && category === 'all') {
                query = `
                    SELECT * FROM (
                        SELECT *, ROW_NUMBER() OVER(PARTITION BY genre ORDER BY is_popular DESC, release_date DESC) as row_num 
                        FROM games
                    ) g WHERE row_num <= 6
                `;
            } else {
                query = "SELECT * FROM games WHERE 1=1";
                if (search) {
                    query += " AND (title LIKE ? OR description LIKE ?)";
                    params.push(`%${search}%`, `%${search}%`);
                }
                if (category !== 'all') {
                    // Match exact genre now
                    query += " AND genre = ?";
                    params.push(category);
                }
            }

            if (sort === 'name-asc') {
                query += " ORDER BY title ASC";
            } else if (sort === 'name-desc') {
                query += " ORDER BY title DESC";
            } else {
                query += " ORDER BY is_popular DESC, release_date DESC";
            }

            const [rows] = await db.query(query, params);

            // Format the badges array to match frontend schema
            const formattedRows = rows.map(g => ({
                id: g.id,
                title: g.title,
                description: g.description,
                category: g.category,
                genre: g.genre,
                thumbnail: g.thumbnail,
                game_url: g.game_url,
                release_date: g.release_date,
                badges: [g.genre.toUpperCase()],
                footerBadge: g.is_popular ? 'POPULAR' : ''
            }));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(formattedRows));
        } catch (err) {
            console.error("Database games query error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read data from database' }));
        }
    }

    // Route 3: Write operation on MySQL (Contact Us)
    // Requirement 2: Perform write operation in the server side
    else if (req.url === '/api/contact' && req.method === 'POST') {
        myEmitter.emit('apiCall', '/api/contact'); // Trigger custom event emitter
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { name, email, type, message } = JSON.parse(body);

                // Insert into MySQL directly
                await db.query(
                    'INSERT INTO messages (name, email, type, message) VALUES (?, ?, ?, ?)',
                    [name, email, type, message]
                );

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Message received successfully!' }));

            } catch (err) {
                console.error("Contact form error:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to save contact message' }));
            }
        });
    }

    // Route 4: Authentication (Signup)
    else if (req.url === '/api/auth/signup' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { username, email, password } = JSON.parse(body);
                // Basic insert without hashing for simplicity in this lab
                const [result] = await db.query(
                    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, password]
                );
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'User created.' }));
            } catch (err) {
                console.error("Signup error:", err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.code === 'ER_DUP_ENTRY' ? 'Username or Email already exists' : 'Failed to sign up' }));
            }
        });
    }
    // Route 5: Authentication (Login)
    else if (req.url === '/api/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { email, password } = JSON.parse(body);

                // First, check if the email exists
                const [emailRows] = await db.query(
                    'SELECT id, username, password FROM users WHERE email = ?',
                    [email]
                );

                if (emailRows.length === 0) {
                    // User not found
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User not found' }));
                    return;
                }

                // Email exists, verify password
                const user = emailRows[0];
                if (user.password === password) {
                    // Password matches
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username } }));
                } else {
                    // Invalid password
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid password' }));
                }
            } catch (err) {
                console.error("Login error:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
    }

    // Fallback for unmatched routes
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server is running strongly on http://localhost:${PORT}`);
});
