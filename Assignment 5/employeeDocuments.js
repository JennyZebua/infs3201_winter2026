const fs = require('fs')
const path = require('path')
const persistence = require('./persistence')

const UPLOAD_DIR = path.join(__dirname, 'uploads')

/**
 * Make sure the uploads folder exists
 */
async function ensureDirectory() {
    let folderExists = await fs.existsSync(UPLOAD_DIR)
    
    if (!folderExists) {
        await fs.mkdirSync(UPLOAD_DIR)
    }
}

/**
 * Upload a document for an employee
 * @param {string} empID - Employee ID
 * @param {object} file - File object from multer
 * @returns {object} Success or error message
 */
async function uploadDocument(empID, file) {
    if (!file) {
        return { success: false, message: "No file uploaded" }
    }
    
    if (file.mimetype !== 'application/pdf') {
        return { success: false, message: "Only PDF files are permitted" }
    }
    if (file.size > 2097152) {
        return { success: false, message: "File must not exceed 2MB" }
    }
    
    let existingDocs = await persistence.getEmployeeDocuments(empID)
    if (existingDocs.length >= 5) {
        return { success: false, message: "Maximum 5 documents per employee" }
    }
    
    let folderExists = fs.existsSync(UPLOAD_DIR)
    if (!folderExists) {
        fs.mkdirSync(UPLOAD_DIR)
    }
    
    let timestamp = Date.now()
    let randomNum = Math.floor(Math.random() * 10000)
    let safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    let uniqueFilename = timestamp + '_' + randomNum + '_' + safeName
    let filePath = path.join(UPLOAD_DIR, uniqueFilename)
    
    fs.writeFileSync(filePath, file.buffer)
    
    await persistence.addEmployeeDocument(empID, file.originalname, filePath, file.size)
    
    return { success: true, message: "Document uploaded successfully" }
}

/**
 * Get all documents for an employee
 * @param {string} empID - Employee ID
 * @returns {array} List of documents with readable info
 */
async function getDocuments(empID) {
    let docs = await persistence.getEmployeeDocuments(empID)
    
    for (let i = 0; i < docs.length; i++) {
        let sizeKB = docs[i].size / 1024
        docs[i].displaySize = sizeKB.toFixed(1) + ' KB'
        
        docs[i].uploadDate = docs[i].uploadedAt.toLocaleDateString()
    }
    
    return docs
}

/**
 * Delete a document
 * @param {string} docId - Document record ID
 * @returns {object} Success or error message
 */
async function deleteDocument(docId) {
    let doc = await persistence.getEmployeeDocument(docId)
    
    if (!doc) {
        return { success: false, message: "Document not found" }
    }
    
    let fileExists = fs.existsSync(doc.storedPath)
    if (fileExists) {
        fs.unlinkSync(doc.storedPath)
    }

    await persistence.deleteEmployeeDocument(docId)
    
    return { success: true, message: "Document deleted successfully" }
}

/**
 * Get a single document by ID
 * @param {string} docId - Document record ID
 * @returns {object} Document record
 */
async function getDocument(docId) {
    return await persistence.getEmployeeDocument(docId)
}


module.exports = {
    ensureDirectory,
    uploadDocument,
    getDocuments,
    deleteDocument,
    getDocument
}
