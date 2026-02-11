const business = require('./business')
const prompt = require('prompt-sync')()

/**
 * Lists all employees and their details. 
 * 
 * @returns {Promise<Array>} - A promise that resolves when the list of employees have been displayed.
 */
async function listAllEmployees() {
    let employeeInformation = await business.listEmployees();
    let maxLength = 'Name'.length

    for (let e of employeeInformation){
        if (e.name.length > maxLength) {
            maxLength = e.name.length
        }
    }
    console.log("Employee ID".padEnd(12), "Name".padEnd(maxLength + 10), "Phone".padEnd(10))
    console.log("-".repeat(12), "-".repeat(maxLength + 10), "-".repeat(10))

    for (let employee of employeeInformation) {
        console.log(employee.employeeId.padEnd(12), employee.name.padEnd(maxLength + 10), employee.phone.padEnd(15));
    }
}

/**
 * Adds the new employee to the system.
 * 
 * @param {string} newEmployeeName - The name of the new employee.
 * @param {string} newEmployeePhone - The phone number of the new employee.
 * 
 */
async function addNewEmployee(newEmployeeName, newEmployeePhone){
    await business.addEmployeeToList(newEmployeeName, newEmployeePhone);
    console.log("New Employee Added")
    
}

/**
 * Assigns specified employee to a shift.
 * 
 * @param {string} empID - Employee ID
 * @param {string} shiftID - Shift ID
 */
async function assignShift(empID, shiftID) {
    let assigning = await business.assigningShifts(empID, shiftID);
    console.log(assigning)
    
}

/**
 * Views schedule for the specific employee.
 * 
 * @param {string} empID - Employee ID to search for.
 */
async function viewSchedule(empID) {
    let schedule = await business.viewEmployeeSchedule(empID);
    if (schedule.length === 0){
        return console.log("No schedule for this employee.")
    }
    console.log("date,startTime,endTime")
    console.log(schedule)
}

/**
 * Finds and displays information about the specific employee.
 * 
 * @param {string} emID - Employee ID
 */
async function findEmployee(emID){
    let result = await business.employeeInformation(emID);
    console.log("Employee Information:")
    console.log("Employee ID: " + result.employeeId);
    console.log("Name: " + result.name);
    console.log("Phone: " + result.phone);
}

/**
 * Main function that runs the command-line interface.
 */
async function main() {

    while (true) {
        console.log('Options:')
        console.log('1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Find employee')
        console.log('6. Exit')
        let selection = Number(prompt("What is your choice> "))
        if (selection == 1) {
            await listAllEmployees();
        }
        else if (selection == 2) {
            let newEmployeeName = prompt("Employee Name: ")
            let newEmployeePhone = prompt("Employee Phone: ")
            await addNewEmployee(newEmployeeName, newEmployeePhone);
        }
        else if (selection == 3) {
            let empID = prompt("Enter Employee ID: ")
            let shiftID = prompt("Enter Shift ID: ")
            await assignShift(empID, shiftID);
        }
        else if (selection == 4) {
            let empID = prompt("Enter employee ID: ")
            await viewSchedule(empID);
        }
        else if (selection == 5){
            let emID = prompt("Enter the ID of the employee you want to find: ")
            await findEmployee(emID);
        }
        else if (selection == 6) {
            break
        }
        else {
            console.log('Pick a number between 1 and 6')
        }
    }

}
main()


