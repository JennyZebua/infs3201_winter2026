const persistence = require("./persistence")
const crypto = require("crypto")
const mongodb = require('mongodb')

/**
 * * Hashes a password using SHA-256 algorithm.
 * 
 * @param {string} password - The plain text password to hash.
 * @returns {string} The hexadecimal representation of the hashed password.
 */ 
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}


/**
 * Creates a new session for authenticated users.
 * 
 * @param {Object} data - The session data to store (typically contains username and role).
 * @returns {Promise<string>} A promise that resolves to the generated session key (UUID).
 */
async function startSession(data) {
    let sessionKey = crypto.randomUUID()

    let expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 5)

    await persistence.saveSession(sessionKey, expiry, data)

    return sessionKey
}

/**
 * Retrieves the role of a user by username.
 * 
 * @param {string} username - The username to look up.
 * @returns {Promise<string>} A promise that resolves to the user's role.
 */
async function getRole(username) {
    let user = await persistence.getUserDetails(username);
    return user.role;
}

/**
 * Retrieves session data for a given session key if the session is still valid.
 * 
 * @param {string} key - The session key (UUID) to look up.
 * @returns {Promise<Object|null>} A promise that resolves to the session data if found and not expired, or null if session is invalid or expired.
 */
async function getSessionData(key) {
    return await persistence.getSessionData(key)
}

/**
 * Adds a security log entry for access tracking.
 * 
 * @param {string} timestamp - ISO timestamp of the access event.
 * @param {string} username - The username associated with the access (or "unknown" if not authenticated).
 * @param {string} url - The URL endpoint that was accessed.
 * @param {string} method - The HTTP method used (GET, POST, etc.).
 * @returns {Promise<Object>} A promise that resolves to the result of the insert operation.
 */
async function addSecurityLog(timestamp, username, url, method) {
    return await persistence.addLog(timestamp, username, url, method)
}

/**
 * Deletes a session by its key (logout).
 * 
 * @param {string} key - The session key (UUID) to delete.
 * @returns {Promise<void>} A promise that resolves when the session is deleted.
 */
async function deleteSession(key) {
    await persistence.deleteSession(key)
}

/**
 * Retrieves information about an employee using their employee ID.
 * 
 * @param {String} emID - The employee ObjectId to search for.
 * @returns {Promise<Object|string>} A promise that resolves to an object containing photo, name, and phone if found, or a string "Employee not found" if not found.
 */
async function employeeInformation(emID) {
    let employee = await persistence.findEmployee(emID);
    if (employee === null) {
        return "Employee not found";
    }
    let defaultPhoto = 'https://i.pinimg.com/736x/54/95/07/549507b290b7b3ee0626e5710a354f39.jpg'
    return { photo: employee.photo || defaultPhoto, name: employee.name, phone: employee.phone };
}
/**
 * 
 * @returns {Promise<Array>} - Returns the list of all employees.
 */
async function listEmployees() {
    return await persistence.readEmployees();
}

/**
 * Adds new employee to the employee list.
 * 
 * @param {String} employeeName - The name of the new employee.
 * @param {String} employeePhone - The phone number of the new employee.
 * @param {String} [employeePhoto=null] - Optional photo URL for the employee. Uses default photo if not provided.
 * 
 * @returns {Promise<void>} A promise that resolves when the employee is added.
 */
async function addEmployeeToList(employeeName, employeePhone, employeePhoto = null) {
    let defaultPhoto = 'https://i.pinimg.com/736x/54/95/07/549507b290b7b3ee0626e5710a354f39.jpg';
    let newEmployee = {
        name: employeeName,
        phone: employeePhone,
        photo: employeePhoto || defaultPhoto
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
 * Validates that the employee is not already assigned to the shift and that
 * the assignment does not exceed the daily maximum working hours.
 * 
 * @param {String} emID - The employee ObjectId as a string.
 * @param {String} sID - The shift ObjectId as a string.
 * @returns {Promise<string>} A promise that resolves to a message indicating the result:
 * - "Employee not found" if the employee ID is invalid
 * - "Shift not found" if the shift ID is invalid
 * - "Already assigned to this shift" if the employee is already in the shift
 * - "Exceeds daily hour limit" if the assignment would exceed max daily hours
 * - "Shift assigned" on successful assignment
 */
async function assigningShifts(emID, sID) {
    let allShifts = await persistence.readShifts();
    let allEmployees = await persistence.readEmployees();
    let maxDaily = await persistence.readMaxHours();


    let newEMID = new mongodb.ObjectId(emID);
    let newSID = new mongodb.ObjectId(sID);

    let employeeFound = null;
    for (let i = 0; i < allEmployees.length; i++) {
        if (allEmployees[i]._id.equals(newEMID)) {
            employeeFound = allEmployees[i];
            break;
        }
    }
    if (!employeeFound) return "Employee not found";

    let shiftFound = null;
    for (let i = 0; i < allShifts.length; i++) {
        if (allShifts[i]._id.equals(newSID)) {
            shiftFound = allShifts[i];
            break;
        }
    }
    if (!shiftFound) return "Shift not found";


    for (let i = 0; i < shiftFound.employees.length; i++) {
        if (shiftFound.employees[i].equals(newEMID)) {
            return "Already assigned to this shift";
        }
    }
    let totalHours = 0;
    for (let i = 0; i < allShifts.length; i++) {
        let shift = allShifts[i];
        if (shift.date !== shiftFound.date) {
            continue;
        }
        for (let j = 0; j < shift.employees.length; j++) {
            if (shift.employees[j].equals(newEMID)) {
                totalHours += await computeShiftDuration(shift.startTime, shift.endTime, shift.date);
                break;
            }
        }
    }

    let newHours = await computeShiftDuration(shiftFound.startTime, shiftFound.endTime, shiftFound.date);

    if (totalHours + newHours > maxDaily.maxDailyHours) {
        return "Exceeds daily hour limit";
    }

    await persistence.addEmployeeToShift(sID, emID)

    return "Shift assigned";
}

/**
 * Retrieves schedule of shifts of the specific employee.
 * @param {String} emID - The employee ID used to search for.
 * 
 * @returns {Promise<Array>} A promise that resolves to an array containing the employee's shifts, including date, start time, and end time.
 */
async function viewEmployeeSchedule(emID) {
    let employeeShifts = await persistence.getEmployeeShifts(emID);

    let foundShifts = [];
    for (let i = 0; i < employeeShifts.length; i++) {
        let s = employeeShifts[i];
        foundShifts.push([s.date, s.startTime, s.endTime]);
    }
    return foundShifts;
}
async function updateEmployeeDetails(empID, updatedDetails) {
    if (updatedDetails.name.trim().length === 0) {
        return "Empty"
    }

    const phoneRegex = /^[0-9]{4}-[0-9]{4}$/;

    if (!phoneRegex.test(updatedDetails.phone.trim())) {
        return "Invalid"
    }

    return await persistence.updateEmployeeDetails(empID, updatedDetails);
}



module.exports = {
    checkLogin,
    startSession,
    getRole,
    getSessionData,
    addSecurityLog,
    deleteSession,
    employeeInformation,
    listEmployees,
    addEmployeeToList,
    computeShiftDuration,
    assigningShifts,
    viewEmployeeSchedule,
    updateEmployeeDetails
}
