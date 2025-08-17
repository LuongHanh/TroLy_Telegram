import express from "express";
import { poolPromise, sql } from "../config/db.js";

const router = express.Router();

// Get all
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT * FROM PersonalSchedule ORDER BY Time ASC");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add
router.post("/", async (req, res) => {
  try {
    const { title, time } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Title", sql.NVarChar, title)
      .input("Time", sql.Char, time)
      .query(`
        INSERT INTO PersonalSchedule (Title, Time)
        OUTPUT INSERTED.*
        VALUES (@Title, @Time)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const { title, time } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Id", sql.Int, req.params.id)
      .input("Title", sql.NVarChar, title)
      .input("Time", sql.Char, time)
      .query(`
        UPDATE PersonalSchedule
        SET Title=@Title, Time=@Time, UpdatedAt=GETDATE()
        OUTPUT INSERTED.*
        WHERE Id=@Id
      `);
    if (!result.recordset.length) return res.status(404).json({ message: "Not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Id", sql.Int, req.params.id)
      .query("DELETE FROM PersonalSchedule WHERE Id=@Id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
