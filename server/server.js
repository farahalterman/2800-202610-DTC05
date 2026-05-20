
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
  database: process.env.DB_NAME,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});



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

app.listen(3000, () => console.log("Server running on port 3000"));



