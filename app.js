const sql = require('mssql');
require('dotenv').config();
const http = require('http');
const url = require('url');

const {
    addFourRows,
    getPatientTable
} = require("./prompts/queries");

const {
    couldNotQueryDatabase,
    ServerListening
} = require("./prompts/strings");

const config = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // Necessary for Azure SQL Database
        trustServerCertificate: false // Change to true if you have issues with certificate
    }
};

console.log(process.env.DB_SERVER);
console.log(process.env.DB_USER);

async function queryMSQL(queryString) {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query(queryString);
        return products.recordset;
    } catch (error) {
        console.log(error);
        return null; // or any default value indicating error
    }
}


function sendResponse(res, statusCode, contentType, body) {
    res.writeHead(statusCode, { "Content-Type": contentType });
    res.end(JSON.stringify(body));
}

async function addFourPatients(res) {
    try {
        let pool = await sql.connect(config);

        const patientsToAdd = [
            {name: 'Sara Brown', dob: '1901-01-01' },
            {name: 'John Smith', dob: '1941-01-01' },
            {name: 'Jack Ma', dob: '1961-01-30' },
            {name: 'Elon Musk', dob: '1999-01-01' }
        ];

        for (const patient of patientsToAdd) {
            try {
                const { query, parameters } = addFourRows(patient.name, patient.dob);
                const request = pool.request();
                
                parameters.forEach(p => request.input(p.name, p.type, p.value));
                
                await request.query(query);
            } catch (error) {
                console.error('Error inserting patient:', patient.name, error);
                // Break or continue based on your error handling policy
            }
        }
        
        console.log('Four patients added successfully.');

        // Query the table after adding patients
        const queryResult = await queryMSQL(getPatientTable);

        // Send response with the query result
        sendResponse(res, 200, "application/json", {
            result: queryResult
        });
    } catch (error) {
        console.error('Error adding patients:', error);
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

    if (req.method == "POST" && parsedUrl.pathname == "/api/4rows") {
        addFourPatients(res);
        
        //TODO: return updated table with three rows added, send as a response
    } else if (req.method == "POST" && parsedUrl.pathname == "/api/custom") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async() => {
            try {
                const data = JSON.parse(body);
                const result = await queryMSQL(data.query);
                sendResponse(res, 200, "application/json", {
                    success: "good job"
                });
            } catch (e) {
                sendResponse(res, 400, "application/json", {
                    error: couldNotQueryDatabase
                });
            }
        });
    } else if (req.method == "GET" && parsedUrl.pathname == "/api/custom") {
        const query = parsedUrl.query.query;
        const result = await queryMSQL(query);
        sendResponse(res, 200, "application/json", {
            query: result
        });

    } 
});

const port = process.env.port || 8888;
server.listen(port, () => console.log(`ServerListening(${port})`));
