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
    }
}

async function getUserDetails(username) {
    await connectDatabase()
    let userdata = await users.findOne({ username: username })
    return userdata;
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
