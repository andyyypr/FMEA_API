const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Anaisabel*123",
  database: "fmea_db",
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Base de datos conectada");
});

module.exports = db;
