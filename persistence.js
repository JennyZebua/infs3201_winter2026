const fs = require('fs/promises')

async function readAssignments() {
    let assignments = await fs.readFile("assignments.json", "utf8")
    let assignment = JSON.parse(assignments)
    return assignment
}

async function readShifts() {
    let shiftData = await fs.readFile("shifts.json", "utf8")
    let shifts = JSON.parse(shiftData)
    return shifts
}

async function readEmployees() {
    let data = await fs.readFile("employees.json", "utf8")
    let employees = JSON.parse(data)
    return employees
}

async function saveEmployeeList(employeeInfo) {
    await fs.writeFile('employees.json', JSON.stringify(employeeInfo, null, 2));
}

async function saveAssignments(assignmentsInfo) {
    await fs.writeFile('assingments.json', JSON.stringify(assignmentsInfo, null, 2));
}
async function addEmployee(newEmployee) {
    let employeeList = await readEmployees();
    employeeList.push(newEmployee)
    await saveEmployeeList(employeeList);
}

async function addAssignment(assignmentInfo) {
    let assignmentList = await readAssignments();
    assignmentList.push(assignmentInfo)
    await saveAssignments(assignmentList);
}
module.exports = {readAssignments, readShifts, readEmployees, saveEmployeeList, saveAssignments, addEmployee, addAssignment}