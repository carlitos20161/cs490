const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Database 
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "carlos2001",
    database: "sakila",
    port: 3306
});

app.get("/film/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [movie] = await db.query(`
            SELECT f.film_id, 
                   MAX(f.title) AS title, 
                   MAX(f.description) AS description, 
                   MAX(f.release_year) AS release_year, 
                   MAX(c.name) AS category, 
                   MAX(l.name) AS language, 
                   SUM(CASE WHEN i.inventory_id NOT IN (SELECT inventory_id FROM rental WHERE return_date IS NULL) THEN 1 ELSE 0 END) AS copies
            FROM film f
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN language l ON f.language_id = l.language_id
            JOIN inventory i ON f.film_id = i.film_id
            WHERE f.film_id = ?
            GROUP BY f.film_id
        `, [id]);

        if (movie.length === 0) {
            return res.status(404).json({ error: "Film not found" });
        }

        res.json(movie[0]);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.post("/rent-film", async (req, res) => {
    const { filmId, customerId } = req.body;

    try {
        const [availability] = await db.query(
            `SELECT inventory_id FROM inventory 
            WHERE film_id = ? AND inventory_id NOT IN 
            (SELECT inventory_id FROM rental WHERE return_date IS NULL) 
            LIMIT 1`, 
            [filmId]
        );

        if (availability.length === 0) {
            return res.status(400).json({ error: "No copies available for rent" });
        }

        await db.query(
            `INSERT INTO rental (rental_date, inventory_id, customer_id, staff_id, return_date, last_update)
            VALUES (NOW(), ?, ?, 1, NULL, NOW())`, 
            [availability[0].inventory_id, customerId]
        );

        res.json({ message: "Movie rented successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Costumer invalid" });
    }
});


app.get("/search", async (req, res) => {
    const { query, category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sqlQuery;
    let params = [`%${query}%`];

    if (category === "title") {
        sqlQuery = `
            SELECT SQL_CALC_FOUND_ROWS f.film_id, f.title, c.name AS category, f.release_year, l.name AS language
            FROM film f
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN language l ON f.language_id = l.language_id
            WHERE f.title LIKE ? 
            ORDER BY f.title ASC
            LIMIT ? OFFSET ?
        `;
    } else if (category === "actor") {
        sqlQuery = `
            SELECT SQL_CALC_FOUND_ROWS f.film_id, f.title, c.name AS category, f.release_year, l.name AS language,
                            CONCAT(a.first_name, ' ', a.last_name) AS actor_name
            FROM film f
            JOIN film_actor fa ON f.film_id = fa.film_id
            JOIN actor a ON fa.actor_id = a.actor_id
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN language l ON f.language_id = l.language_id
            WHERE a.first_name LIKE ? OR a.last_name LIKE ?
            ORDER BY a.first_name ASC, f.title ASC
            LIMIT ? OFFSET ?
        `;
        params = [`%${query}%`, `%${query}%`, Number(limit), Number(offset)];
    } else if (category === "genre") {
        sqlQuery = `
            SELECT SQL_CALC_FOUND_ROWS f.film_id, f.title, c.name AS category, f.release_year, l.name AS language
            FROM film f
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN language l ON f.language_id = l.language_id
            WHERE c.name LIKE ?
            ORDER BY c.name ASC, f.title ASC
            LIMIT ? OFFSET ?
        `;
    } else {
        return res.status(400).json({ error: "Invalid search category" });
    }

    try {
        const [movies] = await db.query(sqlQuery, [...params, Number(limit), Number(offset)]);
        const [[{ total }]] = await db.query("SELECT FOUND_ROWS() AS total");

        res.json({ movies, total });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/customers", async (req, res) => {
    const { query, category } = req.query; 

    let sqlQuery = `
        SELECT c.customer_id, 
               c.first_name, 
               c.last_name, 
               c.email, 
               COUNT(r.rental_id) AS rentals
        FROM customer c
        LEFT JOIN rental r ON c.customer_id = r.customer_id 
        AND r.return_date IS NULL 
    `;

    let params = [];

    if (query && category) {
        sqlQuery += " WHERE ";
        if (category === "id") {
            sqlQuery += "c.customer_id LIKE ?";
            params.push(`%${query}%`);
        } else if (category === "firstName") {
            sqlQuery += "c.first_name LIKE ?";
            params.push(`%${query}%`);
        } else if (category === "lastName") {
            sqlQuery += "c.last_name LIKE ?";
            params.push(`%${query}%`);
        }
    }

    sqlQuery += " GROUP BY c.customer_id ORDER BY c.customer_id ASC";

    try {
        const [customers] = await db.query(sqlQuery, params);
        res.json(customers);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put("/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const [result] = await db.query(
            `UPDATE customer 
             SET first_name = ?, last_name = ?, email = ? 
             WHERE customer_id = ?`,
            [firstName, lastName, email, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json({ message: "Customer updated successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put("/rental/:id/return", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query(
            `UPDATE rental SET return_date = NOW() WHERE rental_id = ? AND return_date IS NULL`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Rental not found or already returned" });
        }

        res.json({ message: "Rental returned successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/customer/:id/rentals", async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch active rentals only
        const [rentals] = await db.query(`
            SELECT r.rental_id, f.title, DATE_FORMAT(r.rental_date, '%Y-%m-%d') AS rental_date
            FROM rental r
            JOIN inventory i ON r.inventory_id = i.inventory_id
            JOIN film f ON i.film_id = f.film_id
            WHERE r.customer_id = ? AND r.return_date IS NULL
            ORDER BY r.rental_date DESC
        `, [id]);

        console.log("Active Rentals for Customer", id, rentals); // Debugging
        res.json(rentals);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/customer/:id/rental-history", async (req, res) => {
    const { id } = req.params;

    try {
        const [rentals] = await db.query(`
            SELECT r.rental_id, f.title, DATE_FORMAT(r.rental_date, '%Y-%m-%d') AS rental_date, 
                   DATE_FORMAT(r.return_date, '%Y-%m-%d') AS return_date
            FROM rental r
            JOIN inventory i ON r.inventory_id = i.inventory_id
            JOIN film f ON i.film_id = f.film_id
            WHERE r.customer_id = ?
            ORDER BY r.rental_date DESC
        `, [id]);

        // Separate active and past rentals
        const activeRentals = rentals.filter(rental => rental.return_date === null);
        const pastRentals = rentals.filter(rental => rental.return_date !== null);

        console.log("Customer Rental History", { activeRentals, pastRentals }); // Debugging

        res.json({ activeRentals, pastRentals });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/rent-film", async (req, res) => {
    const { filmId, customerId } = req.body;

    try {
        const [debugBefore] = await db.query(
            `SELECT inventory_id FROM inventory WHERE film_id = ?`,
            [filmId]
        );
        console.log("Before Rental, Available Copies:", debugBefore.length);

        const [availability] = await db.query(
            `SELECT inventory_id FROM inventory 
            WHERE film_id = ? AND inventory_id NOT IN 
            (SELECT inventory_id FROM rental WHERE return_date IS NULL) 
            LIMIT 1`, 
            [filmId]
        );

        if (availability.length === 0) {
            return res.status(400).json({ error: "No copies available for rent" });
        }

        await db.query(
            `INSERT INTO rental (rental_date, inventory_id, customer_id, staff_id, return_date, last_update)
            VALUES (NOW(), ?, ?, 1, NULL, NOW())`, 
            [availability[0].inventory_id, customerId]
        );
        const [debugAfter] = await db.query(
            `SELECT inventory_id FROM inventory WHERE film_id = ?`,
            [filmId]
        );
        console.log("After Rental, Available Copies:", debugAfter.length);

        res.json({ message: "Movie rented successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Customer invalid" });
    }
});

app.post("/customers", async (req, res) => {
    const { firstName, lastName, email, storeId = 1, addressId = 1 } = req.body; // Default storeId and addressId to 1

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO customer (store_id, address_id, first_name, last_name, email, create_date, last_update)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [storeId, addressId, firstName, lastName, email]
        );

        res.json({ message: "Customer added successfully!", customerId: result.insertId });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.sqlMessage || "Internal server error" });
    }
});

app.put("/rental/:id/return", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query(
            `UPDATE rental SET return_date = NOW() WHERE rental_id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Rental not found or already returned" });
        }

        res.json({ message: "Rental returned successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/all-movies", async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.film_id, f.title, c.name AS category, f.release_year, f.length, f.description, l.name AS language
            FROM film f
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN language l ON f.language_id = l.language_id
        `);

        res.json(movies);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/actor/:actorId/top-movies", async (req, res) => {
    const { actorId } = req.params;

    try {
        const [movies] = await db.query(`
            SELECT f.film_id, f.title, f.release_year, COUNT(r.rental_id) AS rented
            FROM film AS f
            JOIN film_actor AS fa ON f.film_id = fa.film_id
            JOIN inventory AS i ON f.film_id = i.film_id
            JOIN rental AS r ON i.inventory_id = r.inventory_id
            WHERE fa.actor_id = ?
            GROUP BY f.film_id
            ORDER BY rented DESC
            LIMIT 5;
        `, [actorId]);

        res.json({ topMovies: movies });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/customers/:id", async (req, res) => {
    const { id } = req.params;

    try {
       
        await db.query("DELETE FROM rental WHERE customer_id = ?", [id]);

      
        const [result] = await db.query("DELETE FROM customer WHERE customer_id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json({ message: "Customer deleted successfully!" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/top-actors", async (req, res) => {
    try {
        const [actors] = await db.query(`
            SELECT a.actor_id, 
                   CONCAT(a.first_name, ' ', a.last_name) AS actor_name,
                   COUNT(r.rental_id) AS film_count
            FROM actor AS a
            JOIN film_actor AS fa ON a.actor_id = fa.actor_id
            JOIN inventory AS i ON fa.film_id = i.film_id
            JOIN rental AS r ON i.inventory_id = r.inventory_id
            GROUP BY a.actor_id
            ORDER BY film_count DESC
            LIMIT 5;
        `);

        res.json(actors);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/customer/:id/rentals", async (req, res) => {
    const { id } = req.params;

    try {
        const [rentals] = await db.query(`
            SELECT r.rental_id, f.title, DATE_FORMAT(r.rental_date, '%Y-%m-%d') AS rental_date
            FROM rental r
            JOIN inventory i ON r.inventory_id = i.inventory_id
            JOIN film f ON i.film_id = f.film_id
            WHERE r.customer_id = ? AND r.return_date IS NULL
            ORDER BY r.rental_date DESC
        `, [id]);

        res.json(rentals);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/top-rented-films", async (req, res) => {
    try {
        const [movies] = await db.query(`
            SELECT f.film_id, f.title, f.release_year, f.length, f.description, l.name AS language,
                   COUNT(r.rental_id) AS rented
            FROM film AS f
            JOIN inventory AS i ON f.film_id = i.film_id
            JOIN rental AS r ON i.inventory_id = r.inventory_id
            JOIN language AS l ON f.language_id = l.language_id
            GROUP BY f.film_id, f.title, f.release_year, f.length, f.description, l.name
            ORDER BY rented DESC
            LIMIT 5
        `);

        res.json(movies); 
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Start server
app.listen(5001, () => {
    console.log("Server running on port 5001");
});
