import { Router } from "express";
import bcrypt from "bcrypt";
import { generateToken, authenticate } from "./auth.js";

const SALT_ROUNDS = 12;

/**
 * Factory: creates auth router with access to the DB pool.
 * @param {import("pg").Pool} pool
 */
export default function createAuthRouter(pool) {
  const router = Router();

  // REGISTER
  router.post("/api/auth/register", async (req, res) => {
    try {
      const { first_name, last_name, email, password, home_location } = req.body;

      // Validate required fields
      if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
          error: "first_name, last_name, email, and password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters",
        });
      }

      // Check if email already exists
      const existing = await pool.query(
        'SELECT user_id FROM "User" WHERE email = $1',
        [email],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      const result = await pool.query(
        `INSERT INTO "User" (first_name, last_name, email, password, home_location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id, first_name, last_name, email, admin, home_location, created_at`,
        [first_name, last_name, email, hashedPassword, home_location || null],
      );

      const user = result.rows[0];
      const token = generateToken(user);

      res.status(201).json({ user, token });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // LOGIN
  router.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      // Find user by email
      const result = await pool.query(
        'SELECT * FROM "User" WHERE email = $1',
        [email],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];

      // Compare password with stored hash
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user);

      // Don't send the password hash back
      const { password: _, ...safeUser } = user;

      res.json({ user: safeUser, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ME
  router.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT user_id, first_name, last_name, email, admin,
                home_location, tutorial, settings, created_at, updated_at
         FROM "User" WHERE user_id = $1`,
        [req.user.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error("Me error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  return router;
}
