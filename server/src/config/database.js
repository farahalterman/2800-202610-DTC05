const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT,
    logging: false, // Disable logging SQL queries
    define: {
      timestamps: true, // Automatically add createdAt and updatedAt fields
      underscored: true, // Use snake_case for column names
    },
  },
);

module.exports = sequelize;
