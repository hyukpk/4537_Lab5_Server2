const sql = require('mssql');
require('dotenv').config();
const cors = require('cors');


// CORS options
const corsOptions = {
  origin: 'https://yourfrontenddomain.netlify.app', // Replace with your Netlify domain
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: true, // Necessary for Azure SQL Database
      trustServerCertificate: false // Change to true if you have issues with certificate
    }
  };

sql.connect(config).then(pool => {
    // You can use pool.request() to interact with your database
  }).catch(err => {
    console.error('Database connection failed: ', err);
  });

// Example to insert data
app.post('/add-patient', async (req, res) => {
    try {
      const { name, dateOfBirth } = req.body;
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('name', sql.VarChar, name)
        .input('dateOfBirth', sql.DateTime, new Date(dateOfBirth))
        .query('INSERT INTO Patients (name, dateOfBirth) VALUES (@name, @dateOfBirth)');
  
      res.json({ message: 'Patient added successfully', result });
    } catch (err) {
      console.error('Error inserting patient: ', err);
      res.status(500).json({ message: 'Error inserting patient', err });
    }
  });
  
  // Example to retrieve data
  app.get('/get-patients', async (req, res) => {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request().query('SELECT * FROM Patients');
      res.json(result.recordset);
    } catch (err) {
      console.error('Error retrieving patients: ', err);
      res.status(500).json({ message: 'Error retrieving patients', err });
    }
  });
  
