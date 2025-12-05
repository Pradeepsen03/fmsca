const express = require("express");
const mysql = require("mysql2");
const app = express();
const port = 5000;
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// Middleware added.
app.use(cors());
app.use(express.json());

// Create a MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
});

// Connect to MySQL with API
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// API endpoint to get data with columns specified in body
app.post("/api/data", (req, res) => {
  // Get pagination parameters from query
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  // Get columns parameter from body.
  const columns = req.body.columns;
  console.log(columns);

  const selectedColumns =
    columns && Array.isArray(columns) && columns.length > 0 ? columns : ["*"];

  // Validate page and pageSize
  if (page <= 0 || pageSize <= 0) {
    return res.status(400).send("Invalid page or pageSize");
  }

  // Query to get total count of records
  db.query(
    "SELECT COUNT(*) AS total FROM fmsca_records",
    (err, countResult) => {
      if (err) {
        console.error("Error querying MySQL for count:", err);
        res.status(500).send("Server error");
        return;
      }

      const totalRecords = countResult[0].total;
      const lastPage = Math.ceil(totalRecords / pageSize);

      // Construct the query dynamically based on selected columns
      const query = `SELECT ${selectedColumns.join(
        ", "
      )} FROM fmsca_records LIMIT ? OFFSET ?`;

      // Query to get paginated records with selected columns
      db.query(query, [pageSize, offset], (err, results) => {
        if (err) {
          console.error("Error querying MySQL for data:", err);
          res.status(500).send("Server error");
          return;
        }

        // Send paginated response
        res.json({
          page,
          pageSize,
          lastPage,
          totalRecords,
          data: results,
        });
      });
    }
  );
});

app.get("/api/data/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    `SELECT * FROM fmsca_records WHERE record_id=?`,
    [id],
    (err, results) => {
      if (err) {
        console.error("Error querying MySQL:", err);
        res.status(500).send("Server error");
        return;
      }
      res.json(results);
    }
  );
});

app.get("/api/columns", (req, res) => {
  db.query("SHOW COLUMNS FROM fmsca_records", (err, results) => {
    if (err) {
      console.error("Error querying MySQL for columns:", err);
      res.status(500).send("Server error");
      return;
    }
    const columns = results.map((column) => column.Field);
    res.json({ columns });
  });
});

// Start the server start.
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



