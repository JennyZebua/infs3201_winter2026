const { MongoClient } = require('mongodb')
const mongodb = require('mongodb')

let client = undefined;

async function connectDatabase() {
    if (!client) {
        client = new MongoClient('mongodb+srv://60306941:Jennz215215@cluster0.y6vfrk4.mongodb.net/infs3201_winter2026?retryWrites=true&w=majority')
        await client.connect()
    }
}
async function readAssignments() {
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let assignments = db.collection('assignments')
    return await assignments.find().toArray();

}
async function readEmployees() {
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let employees = db.collection('employees')
    let emp =  await employees.find().toArray();
    return emp;

}
async function readShifts() {
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let shifts = db.collection('shifts')
    return await shifts.find().toArray();

}

async function findEmployee(empID){
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let employees = db.collection('employees');
    let emp = await employees.findOne({employeeId: empID})
    return emp;
}

async function addEmployee(newEmployee){
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let employees = db.collection('employees');
    await employees.insertOne(newEmployee);
}

async function addAssignment(assignmentInfo){
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let assignments = db.collection('assignments');
    await assignments.insertOne(assignmentInfo);
}

async function readMaxHours() {
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let config = db.collection('config');
    const configData = await config.findOne({});
    return configData.maxDailyHours;
}

async function updateEmployeeDetails(empID, newDetails){
    await connectDatabase();
    let db = client.db('infs3201_winter2026');
    let employees = db.collection('employees');
    return await employees.updateOne({ employeeId : empID},{ $set: {name : newDetails.name.trim(), phone: newDetails.phone}});
}


module.exports = {readAssignments, readEmployees, readShifts, findEmployee, addEmployee, addAssignment, readMaxHours, updateEmployeeDetails}