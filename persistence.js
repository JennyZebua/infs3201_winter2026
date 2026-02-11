const fs = require('fs/promises')

/**
 * 
 * @returns {Promise<Array>} - Array of assignments
 */
async function readAssignments() {
    let assignments = await fs.readFile("assignments.json", "utf8")
    return JSON.parse(assignments)
}

/**
 * 
 * @returns {Promise<Array>} - Array of shifts
 */
async function readShifts() {
    let shiftData = await fs.readFile("shifts.json", "utf8")
    return JSON.parse(shiftData)
}
/**
 * 
 * @returns {Promise<Array>} - Array of employees
 */
async function readEmployees() {
    let data = await fs.readFile("employees.json", "utf8")
    return JSON.parse(data)
}

/**
 * Returns a single employee with the given employeeID.
 * If employee is found, it will return the employee information.
 * If employee is not found, it will return null.
 * 
 * @param {String} empID - Employee ID to search for.
 * @returns {Promise<Object|null>} A promise that resolves if employee is found or null if not found.
 */
async function findEmployee(empID) {
    let employees = await readEmployees();

    for (let e of employees){
        if (e.employeeId === empID) {
            return e;
        }
    }
    return null;
}

/**
 * @param {String} newEmployee - Information of the new employee including generated ID, name and phone.
 */
async function addEmployee(newEmployee) {
    let employeeList = await readEmployees();
    employeeList.push(newEmployee)
    await fs.writeFile("employees.json", JSON.stringify(employeeList, null, 2));
}

/**
 * 
 * @param {String} assignmentInfo - Information of the new assignment, including employeeID and shiftID.
 */
async function addAssignment(assignmentInfo) {
    let assignmentList = await readAssignments();
    assignmentList.push(assignmentInfo)
    await fs.writeFile('assignments.json', JSON.stringify(assignmentList, null, 2));
}

/**
 * 
 * @returns {number} config.maxDailyHours - The maximum number of working hours an employee can have in a day.
 */
async function readMaxHours(){
    let data = await fs.readFile("config.json", "utf8")
    let config = JSON.parse(data)
    return config
}

module.exports = {readAssignments, readShifts, readEmployees, findEmployee, addEmployee, addAssignment, readMaxHours}