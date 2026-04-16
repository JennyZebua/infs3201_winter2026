const persistence = require("./persistence")
const crypto = require("crypto")
const mongodb = require('mongodb')
const email = require('./emailSystem')
const fs = require('fs')
const path = require('path')

const DOCUMENTS_DIR = path.join(__dirname, 'uploads'); 
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_DOCUMENTS_PER_EMPLOYEE = 5;

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
 * Verify 2FA code with attempt counting and account locking
 * 
 * @param {string} username - The username to verify
 * @param {string} code - The 6-digit 2FA code entered by the user
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 * - status: 'locked' or 'unlocked' - Current account status
 * - success: boolean - Whether verification succeeded
 * - message: string - Description of the result
 * - user: {username: string, role: string} - User object (only on success)
 */
async function checkLogin(username, password) {
    let user = await persistence.getUserDetails(username)
    if (user && user.locked === true) {
        return { status: 'locked', message: 'Account Locked' }
    }
    if (!user) {
        return undefined;
    }
    let hashed = hashPassword(password);

    if (user.password === hashed) {
        let twoFACode = Math.floor(100000 + Math.random() * 900000).toString()
        let expiry = new Date()
        expiry.setMinutes(expiry.getMinutes() + 3)

        await persistence.save2FACode(username, twoFACode, expiry)

        await email.send2FACode(user.email, username, twoFACode)
        return {
            username: user.username,
            role: user.role,
            require2FA: true
        }
    }
    return undefined
}

/**
 * Verify 2FA code with attempt counting and account locking
 */
async function verify2FACode(username, code) {
    let user = await persistence.getUserDetails(username)
    
    if (user && user.locked === true) {
        return { status: 'locked', message: 'Account Locked' }
    }
    let twoFA = await persistence.get2FACode(username)
    

    if (!twoFA) {
        return { status: 'unlocked', success: false, message: 'No 2FA code found. Please login again.' }
    }
    
    let currentTime = new Date()
    let expiryTime = new Date(twoFA.expiry)

    if (currentTime > expiryTime) {
        await persistence.delete2FACode(username)
        return { status: 'unlocked', success: false, message: '2FA Code Expired. Please login again.' }
    }

    if (twoFA.code === code) {
        await persistence.delete2FACode(username)
    
        return {
            status: 'unlocked',
            success: true,
            user: { username: user.username, role: user.role }
        }
    }
    
    let currentAttempts = twoFA.attempts || 0
    let newAttempts = currentAttempts + 1
    
    await persistence.update2FAAttempts(username, newAttempts)
    

    if (newAttempts === 3) {
        await email.alertSuspiciousActivity(user.email, newAttempts)
    }
    
    if (newAttempts >= 10) {
        await persistence.lockUserAccount(username)
        await email.sendLockedAccountNotification(user.email)
        await persistence.delete2FACode(username)
        return { status: 'locked', success: false, message: 'Account locked. Too many failed attempts.' }
    }
    
    let remainingAttempts = 10 - newAttempts

    return { 
        status: 'unlocked', 
        success: false, 
        message: 'Invalid code. ' + remainingAttempts + ' attempts remaining.' 
    }
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
    expiry.setHours(expiry.getHours() + 8)  // Fixed: 8 hours instead of 5 minutes

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
 * 
 * @param {string} startTime - The start time in HH:mm format.
 * @param {string} endTime - The end time in HH:mm format.
 * @returns {number} The duration in hours as a real number.
 */
async function computeShiftDuration(startTime, endTime, date) {
    let start = new Date(`${date}T${startTime}:00Z`);
    let end = new Date(`${date}T${endTime}:00Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    let duration = (end - start) / (1000 * 60 * 60);
    return duration;
}

/**
 * Assigns an existing employee to an existing shift.
 * 
 * @param {String} emID - The employee ObjectId as a string.
 * @param {String} sID - The shift ObjectId as a string.
 * @returns {Promise<string>} A promise that resolves to a message indicating the result
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
 * @returns {Promise<Array>} A promise that resolves to an array containing the employee's shifts
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

/**
 * Ensure the upload directory exists
 * @returns {Promise<boolean>} True if directory exists or was created
 */
async function ensureUploadDir() {
    if (!fs.existsSync(DOCUMENTS_DIR)) {
        fs.mkdirSync(DOCUMENTS_DIR, { recursive: true })
    }
    return true
}

/**
 * Upload a PDF document for an employee
 * @param {string} empID - Employee ID
 * @param {object} file - File object from multer with buffer, mimetype, size, originalname
 * @returns {Promise<object>} Object with success boolean and message
 */
async function uploadEmployeeDocument(empID, file) {
    if (!file) {
        return { success: false, message: "No file uploaded" }
    }
    
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, message: "File size exceeds 2MB limit" }
    }
    
    if (file.mimetype !== 'application/pdf') {
        return { success: false, message: "Only PDF documents are permitted" }
    }
    

    let existingDocs = await persistence.getEmployeeDocuments(empID)
    if (existingDocs.length >= MAX_DOCUMENTS_PER_EMPLOYEE) {
        return { success: false, message: `Maximum ${MAX_DOCUMENTS_PER_EMPLOYEE} documents per employee exceeded` }
    }
    
    
    if (!fs.existsSync(DOCUMENTS_DIR)) {
        fs.mkdirSync(DOCUMENTS_DIR, { recursive: true })
    }
    
    
    let timestamp = Date.now()
    let randomNum = Math.floor(Math.random() * 10000)
    let safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    let uniqueFilename = timestamp + '_' + randomNum + '_' + safeName
    let filePath = path.join(DOCUMENTS_DIR, uniqueFilename)
    
    
    fs.writeFileSync(filePath, file.buffer)
    
    
    await persistence.addEmployeeDocument(empID, file.originalname, filePath, file.size)
    
    return { success: true, message: "Document uploaded successfully" }
}

/**
 * Get all documents for an employee
 * @param {string} empID - Employee ID
 * @returns {Promise<Array>} Array of document metadata objects
 */
async function getEmployeeDocuments(empID) {
    let docs = await persistence.getEmployeeDocuments(empID)
    
    
    for (let i = 0; i < docs.length; i++) {
        let sizeKB = docs[i].size / 1024
        docs[i].displaySize = sizeKB.toFixed(1) + ' KB'
        docs[i].uploadDate = new Date(docs[i].uploadedAt).toLocaleDateString()
    }
    
    
    for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
            if (docs[i].uploadedAt < docs[j].uploadedAt) {
                let temp = docs[i]
                docs[i] = docs[j]
                docs[j] = temp
            }
        }
    }
    
    return docs
}

/**
 * Get a single document for viewing
 * @param {string} empID - Employee ID
 * @param {string} docId - Document ID
 * @returns {Promise<object|null>} Object with buffer and metadata, or null if not found
 */
async function getEmployeeDocument(empID, docId) {
    let doc = await persistence.getEmployeeDocument(docId)
    
    
    if (!doc || doc.employeeId !== empID) {
        return null
    }
    
    
    if (fs.existsSync(doc.storedPath)) {
        const fileBuffer = fs.readFileSync(doc.storedPath)
        return {
            buffer: fileBuffer,
            metadata: {
                originalName: doc.originalName,
                id: doc.id
            },
            filename: doc.originalName
        }
    }
    
    return null
}

/**
 * Delete a document from filesystem and database
 * @param {string} empID - Employee ID
 * @param {string} docId - Document ID
 * @returns {Promise<object>} Object with success boolean and message
 */
async function deleteEmployeeDocument(empID, docId) {
    let doc = await persistence.getEmployeeDocument(docId)
    
    if (!doc || doc.employeeId !== empID) {
        return { success: false, message: "Document not found" }
    }
    
    if (fs.existsSync(doc.storedPath)) {
        fs.unlinkSync(doc.storedPath)
    }
    
    await persistence.deleteEmployeeDocument(docId)
    
    return { success: true, message: "Document deleted successfully" }
}

module.exports = {
    checkLogin,
    verify2FACode,
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
    updateEmployeeDetails,
    ensureUploadDir,
    uploadEmployeeDocument,
    getEmployeeDocuments,
    deleteEmployeeDocument,
    getEmployeeDocument
}