const fs = require('fs/promises')
const prompt = require('prompt-sync')()

/**
 * 
 * @returns {Promise<Aray>} - Array of assignments
 */
async function loadAssignments() { DONE
    let assignments = await fs.readFile("assignments.json", "utf8")
    let assignment = JSON.parse(assignments)
    return assignment
}
/**
 * 
 * @returns {Promise<Aray>} - Array of shifts
 */
async function loadShifts() { DONE
    let shiftData = await fs.readFile("shifts.json", "utf8")
    let shifts = JSON.parse(shiftData)
    return shifts
}
/**
 * 
 * @returns {Promise<Aray>} - Array of employees
 */
async function loadEmployees() { DONE
    let data = await fs.readFile("employees.json", "utf8")
    let employees = JSON.parse(data)
    return employees
}
/**
 * Lists all the existing Employee ID's, Names, Phone numbers.
 */
async function listAllEmployees() { PRESENTATION
    let employees = await loadEmployees()
    let maxLength = 'Name'.length

    for (let e of employees){
        if (e.name.length > maxLength) {
            maxLength = e.name.length
        }
    }
    console.log("Employee ID".padEnd(12), "Name".padEnd(maxLength + 10), "Phone".padEnd(10))
    console.log("-".repeat(12), "-".repeat(maxLength + 10), "-".repeat(10))
    for (let employee of employees) {
        console.log(employee.employeeId.padEnd(12), employee.name.padEnd(maxLength + 10), employee.phone.padEnd(15));
    }

}

/**
 * Adds a new employee to the employee.json file.
 * Employee ID is auto-incremented
 * @param {String} newEmployeeName - Name of the new employee
 * @param {String} newEmployeePhone - Phone number of the new employee
 */
async function addNewEmployee(newEmployeeName, newEmployeePhone) {
    let employeeList = await loadEmployees()
    let newNumber = employeeList.length + 1
    let newEmployeeID = "E" + String(newNumber).padStart(3, "0")

    employeeList.push({
        employeeId: newEmployeeID,
        name: newEmployeeName,
        phone: newEmployeePhone
    })
    await fs.writeFile("employees.json", JSON.stringify(employeeList, null, 2));
    console.log('Employee Added....')
}
/**
 * Assigns an employee to a shift
 * Checks if the employee exists
 * Checks if the shift exists
 * Checks if an employee is not already assigned to the same shift
 * Checks if a shift has already been taken by another employee
 * 
 * @param {String} empID - Employee ID
 * @param {String} shiftID - Shift ID
 */
async function assignShift(empID, shiftID) {
    let employees = await loadEmployees()
    let shifts = await loadShifts()
    let assignedShifts = await loadAssignments()

    let employeeFound = false;
    let shiftFound = false;
    let shiftTaken = false;
    let shiftAlreadyTaken = false;


    for (let e of employees) {
        if (e.employeeId === empID) {
            employeeFound = true;
        }
    }
    for (let s of shifts) {
        if (s.shiftId == shiftID) {
            shiftFound = true;
        }
    }
    for (let a of assignedShifts) {
        if (a.employeeId === empID && a.shiftId === shiftID) {
            shiftAlreadyTaken = true;
        }
        if (a.employeeId !== empID && a.shiftId == shiftID) {
            shiftTaken = true;
        }
    }

    if (!employeeFound) {
        console.log(`Employee ${empID} not found`)
    } else if (!shiftFound) {
        console.log(`Shift ${shiftID} not found`)
    } else if (shiftAlreadyTaken) {
        console.log("Employee already assigned to this shift")
    } else if (shiftTaken) {
        console.log("Employee already assigned to a shift")
    } else {
        assignedShifts.push({
            shiftId: shiftID,
            employeeId: empID
        })
        await fs.writeFile("assignments.json", JSON.stringify(assignedShifts, null, 2));
        console.log('Shift recorded.')
    }
}

/**
 * Displays the schedule of the employee
 * 
 * @param {String} empID - The employee ID that will be used to check.
 */
async function viewSchedule(empID) {
    let findAssigned = await loadAssignments()
    let findShift = await loadShifts()

    console.log("date,startTime,endTime")

    for (let a of findAssigned) {
        if (a.employeeId == empID) {
            for (let s of findShift) {
                if (s.shiftId == a.shiftId) {
                    console.log(s.date, s.startTime, s.endTime)

                }
            }
        }
    }
}

async function main() {


    while (true) {
        console.log('Options:')
        console.log('1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')
        let selection = Number(prompt("What is your choice> "))
        if (selection == 1) {
            await listAllEmployees()
        }
        else if (selection == 2) {
            let newEmployeeName = prompt("Employee Name: ")
            let newEmployeePhone = prompt("Employee Phone: ")
            await addNewEmployee(newEmployeeName, newEmployeePhone)
        }
        else if (selection == 3) {
            let empID = prompt("Enter Employee ID: ")
            let shiftID = prompt("Enter Shift ID: ")
            await assignShift(empID, shiftID)
        }
        else if (selection == 4) {
            let empID = prompt("Enter employee ID: ")
            await viewSchedule(empID)
        }
        else if (selection == 5) {
            break
        }
        else {
            console.log('Pick a number between 1 and 5')
        }
    }

}
main()
