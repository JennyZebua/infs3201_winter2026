const { MongoClient } = require('mongodb')
const mongodb = require('mongodb')

let client = undefined
let employees = undefined
let shifts = undefined
let db = undefined
let assignment = undefined

async function connectDatabase() {
    if (!client) {
        client = new MongoClient('mongodb+srv://60306941:Jennz215215@cluster0.y6vfrk4.mongodb.net/infs3201_winter2026?retryWrites=true&w=majority')
        await client.connect()
        db = client.db('infs3201_winter2026');
        employees = db.collection('employees')
        shifts = db.collection('shifts')
        assignment = db.collection('assignments')
    }
}

async function emptyEmployeesArray() {
    await connectDatabase()

    let allShifts = await shifts.find().toArray()

    for (let i = 0; i < allShifts.length; i++) {
        let s = allShifts[i]

        if (s.employees === undefined) {
            await shifts.updateOne(
                { _id: s._id },
                { $set: { employees: [] } }
            )
        }
    }
}

async function embedEmployeeShifts() {
    await connectDatabase();

    let allAssignments = await assignment.find().toArray()
    let allShifts = await shifts.find().toArray()

    for (let i = 0; i < allShifts.length; i++) {
        let s = allShifts[i]
        let addEmployee = []

        for (let j = 0; j < allAssignments.length; j++) {
            let a = allAssignments[j]

            if (a.shiftId === s.shiftId) {
                let e = await employees.findOne({ employeeId: a.employeeId })

                if (e) {
                    addEmployee.push(e._id)
                }
            }
        }
        if (addEmployee.length > 0) {
            await shifts.updateOne(
                { _id: s._id },
                { $set: { employees: addEmployee } }
            )
        }
    }
}
async function removeCustomID() {
    await connectDatabase()

    let allShifts = await shifts.find().toArray()
    for (let i = 0; i < allShifts.length; i++) {
        await shifts.updateOne(
            { _id: allShifts[i]._id },
            { $unset: { shiftId: "" } }
        )
    }

    let allEmployees = await employees.find().toArray()
    for (let i = 0; i < allEmployees.length; i++) {
        await employees.updateOne(
            { _id: allEmployees[i]._id },
            { $unset: { employeeId: "" } }
        )
    }
    await assignment.drop()
}

async function runFunctions() {
    await emptyEmployeesArray()
    await embedEmployeeShifts()
    await removeCustomID()
}
runFunctions()