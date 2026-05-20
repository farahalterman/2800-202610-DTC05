
import "dotenv/config";
import express from "express";
import pg from "pg";
import { searchLocations } from "./gemini.js";
import cors from "cors" // Will need if we host front and back end on different ports


// Middleware
const { Pool } = pg;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static("src"));

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DB_HOST || "localhost",
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server is running on http://localhost:${PORT}`),
);

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});


// ============================================================================
// GEMINI AI FEATURE
// ============================================================================

// GET endpoint to fetch all locations
app.get("/api/locations", async (req, res) => {
  try {
    // PostgreSQL POINT:
    // coordinates[0] = x = longitude
    // coordinates[1] = y = latitude

    const result = await pool.query(`
      SELECT
        location_id,
        location_name,
        coordinates[0] AS longitude,
        coordinates[1] AS latitude,
        overall_rating_avg,
        created_at,
        updated_at
      FROM Location
      ORDER BY overall_rating_avg DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// POST endpoint for Gemini AI search
app.post("/api/search", async (req, res) => {
  try {
    const { query, locations } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await searchLocations(query, locations);

    res.json({ response });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});



// Optional: POST endpoint to submit ratings
app.post("/api/rate", async (req, res) => {
  try {
    const { locationId, rating } = req.body;

    if (!locationId || !rating) {
      return res.status(400).json({
        error: "Location ID and rating are required",
      });
    }

    await pool.query(
      `
      UPDATE Location
      SET
        overall_rating_avg = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE location_id = $2
      `,
      [rating, locationId],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Rating error:", error);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});



// ============================================================================
// USER TABLE
// ============================================================================

// CREATE user
app.post("/api/users", async (req, res) => {
  const { first_name, last_name, email, password, home_location, admin } =
    req.body;

  try {
    const result = await db.query(
      `INSERT INTO "User" (first_name, last_name, email, password, home_location, admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [first_name, last_name, email, password, home_location, admin || false],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// READ all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM "User" ORDER BY created_at DESC',
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ user by ID
app.get("/api/users/:id", async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM "User" WHERE user_id = $1', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ user profile
app.get("/api/users/:id/profile", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        u.*,
        COUNT(DISTINCT r.review_id) as total_reviews,
        COUNT(DISTINCT f.favorite_id) as total_favorites,
        ROUND(AVG(r.overall_rating), 2) as avg_rating_given
      FROM "User" u
      LEFT JOIN Review r ON u.user_id = r.user_id
      LEFT JOIN Favorite f ON u.user_id = f.customer_id
      WHERE u.user_id = $1
      GROUP BY u.user_id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ user's reviews
app.get("/api/users/:id/reviews", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        r.*,
        l.location_name,
        l.coordinates[0] as longitude,
        l.coordinates[1] as latitude
      FROM Review r
      JOIN Location l ON r.location_id = l.location_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ user's favorites
app.get("/api/users/:id/favorites", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        f.favorite_id,
        f.created_at as favorited_at,
        l.location_id,
        l.location_name,
        l.coordinates[0] as longitude,
        l.coordinates[1] as latitude,
        l.overall_rating_avg
      FROM Favorite f
      JOIN Location l ON f.location_id = l.location_id
      WHERE f.customer_id = $1
      ORDER BY f.created_at DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE user
// TODO: Decide which fields should be updateable by the user from the profile page
app.put("/api/users/:id", async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    home_location,
    tutorial,
    settings,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE "User"
       SET first_name = $1, last_name = $2, email = $3, password = $4,
           home_location = $5, tutorial = $6, settings = $7
       WHERE user_id = $8
       RETURNING *`,
      [
        first_name,
        last_name,
        email,
        password,
        home_location,
        tutorial,
        settings,
        req.params.id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM "User" WHERE user_id = $1 RETURNING *',
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});