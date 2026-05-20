const express = require("express");
const app = express();
const cors = require("cors"); // Will need if we host front and back end on different ports

// Middleware
app.use(express.static("src"));
app.use(express.urlencoded());
app.use(cors());

app.listen(3000, () => console.log("Server running on port 3000"));
