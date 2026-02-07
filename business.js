const persistence = require("./persistence")

async function employeeIDGenerator() {
    let employeeList = await persistence.readEmployees();
    let newNumber = employeeList.length + 1
    return "E" + String(newNumber).padStart(3, "0");
}

async function addEmployeeToList(employeeName, employeePhone) {
    let generatedID = await employeeIDGenerator();
    let newEmployee = {
        employeeId: generatedID,
        name: employeeName,
        phone: employeePhone
    }
    await persistence.addEmployee(newEmployee);
}

async function assigningShifts(empID, sID) {
    let employees = await persistence.readEmployees();
    let shifts = await persistence.readShifts();
    let assigned = await persistence.readAssignments();

    let employeeFound = false;
    for (let e of employees) {
        if (e.employeeId == empID) {
            employeeFound == true;
            break;
        }
    }
    if (!employeeFound) {
        return "Employee not found"
    }

    let shiftFound = false;
    for (let s of shifts) {
        if (s.shiftId == sID) {
            shiftFound = true;
            break;
        }
    }
    if (!shiftFound) {
        return "Shift not found"
    }
    for (let a of assigned) {
        if (a.employeeId === empID && a.shiftId === shiftID) {
            return "Shift already assigned to this employee"
        }
        else if (a.employeeId !== empID && a.shiftId == shiftID) {
            return "Shift assigned to another employee"
        }
    }
    let newAssignment = {
        employeeId: empID,
        shiftId: sID
    }
    await persistence.saveAssignments(newAssignment)
}

module.exports = { employeeIDGenerator, addEmployeeToList, assigningShifts }