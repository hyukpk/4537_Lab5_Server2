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
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let globalPoolPromise = sql.connect(config);

async function queryMSQL(queryString) {
    try {
        let pool = await globalPoolPromise;
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
        let pool = await globalPoolPromise;
        const patientsToAdd = [/* Your patients array */];

        await Promise.all(patientsToAdd.map(async (patient) => {
            const { query, parameters } = addFourRows(patient.name, patient.dob);
            const request = pool.request();
            parameters.forEach(p => request.input(p.name, p.type, p.value));
            await request.query(query);
        }));

        console.log('Four patients added successfully.');
        const queryResult = await queryMSQL(getPatientTable);
        sendResponse(res, 200, "application/json", { result: queryResult });
    } catch (error) {
        console.error('Error adding patients:', error);
        sendResponse(res, 500, "application/json", { error: "Failed to add patients" });
    }
}


// async function addFourPatients(res) {
//     try {
//         let pool = await sql.connect(config);

//         const patientsToAdd = [
//             {name: 'Sara Brown', dob: '1901-01-01' },
//             {name: 'John Smith', dob: '1941-01-01' },
//             {name: 'Jack Ma', dob: '1961-01-30' },
//             {name: 'Elon Musk', dob: '1999-01-01' }
//         ];

//         for (const patient of patientsToAdd) {
//             try {
//                 const { query, parameters } = addFourRows(patient.name, patient.dob);
//                 const request = pool.request();
                
//                 parameters.forEach(p => request.input(p.name, p.type, p.value));
                
//                 await request.query(query);
//             } catch (error) {
//                 console.error('Error inserting patient:', patient.name, error);
//                 // Break or continue based on your error handling policy
//             }
//         }
        
//         console.log('Four patients added successfully.');

//         // Query the table after adding patients
//         const queryResult = await queryMSQL(getPatientTable);

//         // Send response with the query result
//         sendResponse(res, 200, "application/json", {
//             result: queryResult
//         });
//     } catch (error) {
//         console.error('Error adding patients:', error);
//     }
// }

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
        try {
            await addFourPatients(res); // Wait for patients to be added before sending response
        } catch (error) {
            console.error('Error adding patients:', error);
            sendResponse(res, 500, "application/json", { error: "Failed to add patients" });
        }
    } else if (req.method == "POST" && parsedUrl.pathname == "/api/custom") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async() => {
            try {
                const data = JSON.parse(body);
                sendResponse(res, 200, "application/json", { success: "good job" });
            } catch (e) {
                console.error('Error executing custom query:', e);
                sendResponse(res, 400, "application/json", { error: couldNotQueryDatabase });
            }
        });
    } else if (req.method == "GET" && parsedUrl.pathname == "/api/custom") {
        try {
            const query = parsedUrl.query.query;
            const result = await queryMSQL(query);
            sendResponse(res, 200, "application/json", { query: result });
        } catch (error) {
            console.error('Error executing custom query:', error);
            sendResponse(res, 400, "application/json", { error: couldNotQueryDatabase });
        }
    } 
    
});

const port = process.env.port || 8888;
server.listen(port, () => console.log(`ServerListening(${port})`));
