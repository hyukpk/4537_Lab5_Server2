const sql = require('mssql');
module.exports = {
    addFourRows: (name, dob) => {
        return {
            query: "INSERT INTO Patients (name, dateOfBirth) VALUES (@name, @dob)",
            parameters: [
                { name: 'name', type: sql.NVarChar, value: name },
                { name: 'dob', type: sql.Date, value: dob }
            ]
        };
    },
    getPatientTable: "SELECT * FROM Patients"
};

