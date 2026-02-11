const persistence = require("./persistence")

/**
 * Retrieves information about an employee using their employee ID.
 * 
 * @param {String} emID - The employeeID to search for.
 * @returns {Promise<Object|string>} A promise that resolves to the employee object if found, or a string "Employee not found" if not found.
 */
async function employeeInformation(emID) {
    let employee = await persistence.findEmployee(emID);
    if (employee === null) {
        return "Employee not found";
    } 
    return employee;
}

/**
 * 
 * @returns {Promise<Array>} - Returns the list of all employees.
 */
async function listEmployees() {
    return await persistence.readEmployees();
}

/**
 * This function generates an employeeID for the new employee.
 * 
 * @returns {Promise<string>} A promise that resolves to the new employee ID.
 */
async function employeeIDGenerator() {
    let employeeList = await persistence.readEmployees();
    let newNumber = employeeList.length + 1
    return "E" + String(newNumber).padStart(3, "0");
}

/**
 * Adds new employee to the employee list.
 * 
 * @param {String} employeeName - The name of the new employee.
 * @param {String} employeePhone - The phone number of the new employee.
 * @returns {Promise<void>} A promise that resolves when the employee is added.
 */
async function addEmployeeToList(employeeName, employeePhone) {
    let generatedID = await employeeIDGenerator();
    let newEmployee = {
        employeeId: generatedID,
        name: employeeName,
        phone: employeePhone
    }

    await persistence.addEmployee(newEmployee);
}

/**
 * Computes the shift duration in hours between two times.
 * This function was generated using ChatGPT with the prompt:
 * "Can you write a JavaScript function `computeShiftDuration(startTime, endTime)` 
 * that calculates the difference between two times in hours, such as `11:00` to `13:30`, 
 * returning `2.5` hours?"
 * (Generated using LLMS)
 * 
 * @param {string} startTime - The start time in HH:mm format.
 * @param {string} endTime - The end time in HH:mm format.
 * @returns {number} The duration in hours as a real number.
 */
async function computeShiftDuration(startTime, endTime, date) {
    let start = new Date(`${date}T${startTime}:00Z`);
    let end = new Date(`${date}T${endTime}:00Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0; // Return 0 for invalid times
    }

    // Handle case where endTime is before startTime (shift spans midnight)
    if (end < start) {
        end.setDate(end.getDate() + 1); // Add one day to end time if it spans midnight
    }

    let duration = (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
    return duration;
}

/**
 * Assigns an existing employee to an existing shift.
 * A shift can only have one employee assigned to it.
 * Shift will only be assigned if the working hours is not exceeded for the day.
 * 
 * @param {String} emID - The employee ID
 * @param {String} sID - The shift ID 
 * @returns {Promise<string>} - A promise message indicating whether the shift was assigned or not. Also if the employee or shift is found or not.
 * 
 */
async function assigningShifts(emID, sID) {
    let employees = await persistence.readEmployees();
    let shifts = await persistence.readShifts();
    let assigned = await persistence.readAssignments();
    let maxDaily = await persistence.readMaxHours();
    

    let employeeFound = false;
    for (let e of employees) {
        if (e.employeeId === emID) {
            employeeFound = true;
        }
    }
    if (!employeeFound) {
        return "Employee not found"
    }

    let shiftFound = false;
    let storeDate = null;
    let shiftStart = null;
    let shiftEnd = null;

    for (let s of shifts) {
        if (s.shiftId === sID) {
            shiftFound = true;
            storeDate = s.date;
            shiftStart = s.startTime;
            shiftEnd = s.endTime;
            break;
        }
    }
    if (!shiftFound) {
        return "Shift not found"
    }

    for (let a of assigned) {
        if (a.employeeId === emID && a.shiftId === sID) {
            return "This employee has already been assigned to this shift"
        }
    }

    let differentEmployeeShift = false;
    for (let a of assigned) {
        if (a.employeeId !== emID && a.shiftId === sID) {
            differentEmployeeShift = true;
        }
    }
    if (differentEmployeeShift == true) {
        return "This shift is assigned to another employee"
    }
    let totalHours = 0;
    for (let a of assigned) {
        if (a.employeeId === emID) {
            for (let s of shifts) {
                if (s.shiftId === a.shiftId && s.date === storeDate) {
                    totalHours += await computeShiftDuration(s.startTime, s.endTime, s.date);
                }
            }
        }
    }
    let newShiftAdded = await computeShiftDuration(shiftStart, shiftEnd, storeDate);
    if (totalHours + newShiftAdded > maxDaily.maxDailyHours) {
        return "This employee exceeds the daily hour limit"
    }

    let newAssignment = {
        shiftId: sID,
        employeeId: emID
    }

    await persistence.addAssignment(newAssignment);
    return "Shift assigned"
}

/**
 * Retrieves schedule of shifts of the specific employee.
 * @param {String} emID - The employee ID used to search for.
 * 
 * @returns {Promise<Array>} A promise that resolves to an array containing the employee's shifts, including date, start time, and end time.
 */
async function viewEmployeeSchedule(emID) {
    let shift = await persistence.readShifts();
    let assigned = await persistence.readAssignments();

    let employeeShifts = [];

    for (let a of assigned) {
        if (a.employeeId === emID) {
            for (let s of shift) {
                if (s.shiftId === a.shiftId) {
                    employeeShifts.push([s.date, s.startTime, s.endTime])
                }
            }
        }
    }
    return employeeShifts;
}

module.exports = { employeeInformation, listEmployees, employeeIDGenerator, addEmployeeToList, computeShiftDuration, assigningShifts, viewEmployeeSchedule }