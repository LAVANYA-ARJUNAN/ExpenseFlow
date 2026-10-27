const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "https://expense-flow-99nb3a8hn-lavanyas-projects-800c12f3.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (for example, direct API checks).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

app.get("/", (req, res) => {
  res.send("ExpenseFlow API is running!");
});

module.exports = app;

// Run a local server only during local development.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const db = require("./config/db");

  async function startServer() {
    try {
      const connection = await db.getConnection();
      console.log("MySQL connected successfully!");
      connection.release();

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error("MySQL connection failed:", error.message);
      process.exit(1);
    }
  }

  startServer();
}