import "dotenv/config";
import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import { searchLocations } from "./gemini.js";
import { authenticate, optionalAuth } from "./auth.js";
import createAuthRouter from "./authRoutes.js";
import cors from "cors"; // Will need if we host front and back end on different ports

const SALT_ROUNDS = 12;

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

// Auth routes (register, login, me)
app.use(createAuthRouter(pool));

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

//TODO: Can this route be deleted now? There is a post for "/api/reviews" now
// app.post('/api/search', async (req, res) => {
//   const { query, locations } = req.body;
//   const response = await searchLocations(query, spots);
//   res.json({ response });
// });

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

// CREATE user (admin use — passwords are automatically hashed)
// Normal registration should go through POST /api/auth/register
app.post("/api/users", authenticate, async (req, res) => {
  const { first_name, last_name, email, password, home_location, admin } =
    req.body;

  if (!first_name || !last_name || !email || !password) {
    return res
      .status(400)
      .json({ error: "first_name, last_name, email, and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO "User" (first_name, last_name, email, password, home_location, admin)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, first_name, last_name, email, admin, home_location, created_at`,
      [first_name, last_name, email, hashedPassword, home_location, admin || false],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ all users (password field excluded)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, first_name, last_name, email, admin, home_location, tutorial, settings, created_at, updated_at FROM "User" ORDER BY created_at DESC',
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ user by ID (password field excluded)
app.get("/api/users/:id", async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, first_name, last_name, email, admin, home_location, tutorial, settings, created_at, updated_at FROM "User" WHERE user_id = $1', [
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
    const result = await pool.query(
      `SELECT
      u.user_id, u.first_name, u.last_name, u.email, u.admin,
      u.home_location, u.tutorial, u.settings, u.created_at, u.updated_at,
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
    const result = await pool.query(
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
    const result = await pool.query(
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

// UPDATE user (requires auth; users can only update their own account)
app.put("/api/users/:id", authenticate, async (req, res) => {
  // Only allow the user themselves (or an admin) to update
  if (req.user.userId !== parseInt(req.params.id) && !req.user.admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

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
    // If password is provided, hash it; otherwise keep the existing one
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const result = await pool.query(
      `UPDATE "User"
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          password = COALESCE($4, password),
          home_location = COALESCE($5, home_location),
          tutorial = COALESCE($6, tutorial),
          settings = COALESCE($7, settings)
      WHERE user_id = $8
      RETURNING user_id, first_name, last_name, email, admin, home_location, tutorial, settings, created_at, updated_at`,
      [
        first_name || null,
        last_name || null,
        email || null,
        hashedPassword || null,
        home_location || null,
        tutorial ?? null,
        settings || null,
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

// DELETE user (requires auth; users can only delete their own account)
app.delete("/api/users/:id", authenticate, async (req, res) => {
  // Only allow the user themselves (or an admin) to delete
  if (req.user.userId !== parseInt(req.params.id) && !req.user.admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const result = await pool.query(
      'DELETE FROM "User" WHERE user_id = $1 RETURNING user_id, first_name, last_name, email',
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

// ============================================================================
// LOCATION TABLE
// ============================================================================

// CREATE location
app.post("/api/locations", async (req, res) => {
  const { location_name, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Location (location_name, coordinates)
      VALUES ($1, POINT($2, $3))
      RETURNING location_id, location_name,
        coordinates[0] as longitude,
        coordinates[1] as latitude,
        overall_rating_avg`,
      [location_name, longitude, latitude],
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all locations.
 *
 * claude.ai
 * @author: Sonnet 4.5
 */
// This GET is from the Gemini API feature
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

// READ location by ID
app.get("/api/locations/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        l.location_id,
        l.location_name,
        l.coordinates[0] as longitude,
        l.coordinates[1] as latitude,
        l.overall_rating_avg,
        l.created_at,
        COUNT(r.review_id) as review_count
      FROM Location l
      LEFT JOIN Review r ON l.location_id = r.location_id
      WHERE l.location_id = $1
      GROUP BY l.location_id`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// REVIEW TABLE
// ============================================================================

// CREATE review
app.post("/api/reviews", async (req, res) => {
  const {
    user_id,
    location_id,
    overall_rating,
    shade_rating,
    accessibility_rating,
    noise_rating,
    review_text,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Review (
      user_id, location_id, overall_rating,
        shade_rating, accessibility_rating, noise_rating, review_text
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        user_id,
        location_id,
        overall_rating,
        shade_rating,
        accessibility_rating,
        noise_rating,
        review_text,
      ],
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ all reviews
app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        r.*,
        u.first_name,
        u.last_name,
        l.location_name
      FROM Review r
      JOIN "User" u ON r.user_id = u.user_id
      JOIN Location l ON r.location_id = l.location_id
      ORDER BY r.created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ review by review ID
app.get("/api/reviews/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        l.location_name,
        l.coordinates[0] as longitude,
        l.coordinates[1] as latitude
      FROM Review r
      JOIN "User" u ON r.user_id = u.user_id
      JOIN Location l ON r.location_id = l.location_id
      WHERE r.review_id = $1`,
      [req.params.id],
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE review by review ID
app.put("/api/reviews/:id", async (req, res) => {
  const {
    overall_rating,
    shade_rating,
    accessibility_rating,
    noise_rating,
    review_text,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Review
       SET overall_rating = $1,
           shade_rating = $2,
           accessibility_rating = $3,
           noise_rating = $4,
           review_text = $5
       WHERE review_id = $6
       RETURNING *`,
      [
        overall_rating,
        shade_rating,
        accessibility_rating,
        noise_rating,
        review_text,
        req.params.id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE review by review ID
app.delete("/api/reviews/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Review WHERE review_id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// FAVORITE TABLE
// ============================================================================

// CREATE favorite
app.post("/api/favorites", async (req, res) => {
  const { customer_id, location_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Favorite (customer_id, location_id)
       VALUES ($1, $2)
       RETURNING *`,
      [customer_id, location_id],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ all favorites
app.get("/api/favorites", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        f.*,
        u.first_name,
        u.last_name,
        l.location_name,
        l.coordinates[0] as longitude,
        l.coordinates[1] as latitude,
        l.overall_rating_avg
      FROM Favorite f
      JOIN "User" u ON f.customer_id = u.user_id
      JOIN Location l ON f.location_id = l.location_id
      ORDER BY f.created_at DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DELETE favorite by favorite ID
app.delete("/api/favorites/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM Favorite WHERE favorite_id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    res.json({ message: "Favorite removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
