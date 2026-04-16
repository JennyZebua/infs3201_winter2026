const { MongoClient } = require('mongodb')
const mongodb = require('mongodb')

let client = undefined
let employees = undefined
let shifts = undefined
let config = undefined
let db = undefined
let users = undefined
let session = undefined
let securityLog = undefined
let twoFACodes = undefined
let employeeDocuments = undefined

async function connectDatabase() {
    if (!client) {
        client = new MongoClient('mongodb+srv://60306941:Jennz215215@cluster0.y6vfrk4.mongodb.net/infs3201_winter2026?retryWrites=true&w=majority')
        await client.connect()
        db = client.db('infs3201_winter2026');
        employees = db.collection('employees')
        shifts = db.collection('shifts')
        users = db.collection('userAccounts')
        config = db.collection('config');
        session = db.collection('sessionData')
        securityLog = db.collection('security_log')
        twoFACodes = db.collection('2FACodes')
        employeeDocuments = db.collection('employeeDocuments')  
    }
}

async function getUserDetails(username) {
    await connectDatabase()
    let userdata = await users.findOne({ username: username })
    return userdata;
}

async function update2FAAttempts(username, attempts) {
    await connectDatabase()
    return await twoFACodes.updateOne(
        { username: username },
        { $set: { attempts: attempts } }
    )
}

async function lockUserAccount(username) {
    await connectDatabase()
    return await users.updateOne(
        { username: username },
        { $set: { locked: true } }
    )
}

async function save2FACode(username, code, expiry) {
    await connectDatabase()
    await twoFACodes.deleteMany({ username: username })
    return await twoFACodes.insertOne({
        username: username,
        code: code,
        expiry: expiry,
        attempts: 0
    })
}

async function get2FACode(username) {
    await connectDatabase()
    return await twoFACodes.findOne({ username: username })
}

async function delete2FACode(username) {
    await connectDatabase()
    return await twoFACodes.deleteOne({ username: username })
}

async function saveSession(uuid, expiry, userData) {
    await connectDatabase()
    const result = await session.insertOne({
        SessionKey: uuid,
        Expiry: expiry,
        Data: userData
    })
    return result
}

async function getSessionData(key) {
    await connectDatabase()
    const sessionData = await session.findOne({ SessionKey: key })
    if (sessionData && new Date() < new Date(sessionData.Expiry)) {
        return sessionData.Data
    }
    return null
}

async function addLog(timestamp, username, url, method) {
    await connectDatabase()
    return await securityLog.insertOne({
        timestamp: timestamp,
        username: username,
        url: url,
        method: method
    })
}

async function deleteSession(key) {
    await connectDatabase()
    await session.deleteOne({ SessionKey: key })
}

async function readEmployees() {
    await connectDatabase();
    let emp = await employees.find().toArray();
    return emp;
}

async function readShifts() {
    await connectDatabase();
    return await shifts.find().toArray();
}

async function findEmployee(empID) {
    await connectDatabase();
    let id = new mongodb.ObjectId(empID)
    return await employees.findOne({ _id: id });
}

async function addEmployee(newEmployee) {
    await connectDatabase();
    await employees.insertOne(newEmployee);
}

async function readMaxHours() {
    await connectDatabase();
    const configData = await config.findOne({});
    return configData.maxDailyHours;
}

async function updateEmployeeDetails(empID, newDetails) {
    await connectDatabase();
    let id = new mongodb.ObjectId(empID)
    return await employees.updateOne(
        { _id: id },
        { $set: { name: newDetails.name.trim(), phone: newDetails.phone } }
    );
}

async function getEmployeeShifts(empID) {
    await connectDatabase();
    let id = new mongodb.ObjectId(empID)
    return await shifts.find({ employees: id }).toArray()
}

async function addEmployeeToShift(sID, empID) {
    await connectDatabase();
    let s = new mongodb.ObjectId(sID)
    let e = new mongodb.ObjectId(empID)
    return await shifts.updateOne(
        { _id: s },
        { $addToSet: { employees: e } }
    )
}
// Add these functions before the module.exports:

/**
 * Get all documents for an employee from database
 * @param {string} empID - Employee ID
 * @returns {Promise<Array>} Array of document records
 */
async function getEmployeeDocuments(empID) {
    await connectDatabase()
    return await employeeDocuments.find({ employeeId: empID }).toArray()
}

/**
 * Add a document record to database
 * @param {string} empID - Employee ID
 * @param {string} originalName - Original filename
 * @param {string} storedPath - Path where file is stored
 * @param {number} size - File size in bytes
 * @returns {Promise<Object>} Insert result
 */
async function addEmployeeDocument(empID, originalName, storedPath, size) {
    await connectDatabase()
    const doc = {
        employeeId: empID,
        originalName: originalName,
        storedPath: storedPath,
        size: size,
        uploadedAt: new Date(),
        id: Date.now().toString() + '_' + Math.floor(Math.random() * 10000)
    }
    return await employeeDocuments.insertOne(doc)
}

/**
 * Delete a document record from database
 * @param {string} docId - Document record ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteEmployeeDocument(docId) {
    await connectDatabase()
    return await employeeDocuments.deleteOne({ id: docId })
}

/**
 * Get a single document by ID
 * @param {string} docId - Document record ID
 * @returns {Promise<Object|null>} Document record or null
 */
async function getEmployeeDocument(docId) {
    await connectDatabase()
    return await employeeDocuments.findOne({ id: docId })
}

module.exports = { 
    getUserDetails, 
    update2FAAttempts,
    lockUserAccount,
    save2FACode,
    get2FACode,
    delete2FACode,
    saveSession, 
    getSessionData, 
    addLog,
    deleteSession, 
    readEmployees, 
    readShifts, 
    findEmployee, 
    addEmployee, 
    readMaxHours, 
    updateEmployeeDetails, 
    getEmployeeShifts,
    addEmployeeToShift,
    getEmployeeDocuments, 
    addEmployeeDocument,   
    deleteEmployeeDocument, 
    getEmployeeDocument
}
