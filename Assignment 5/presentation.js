let express = require('express');
let app = new express()

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true }))

let business = require('./business')

const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')
app.use(cookieParser())

const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }
})

app.set('views', __dirname + "/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())

app.use('/static', express.static(__dirname + "/static"))

business.ensureUploadDir()

async function authenticate(req, res, next){
    let sessionId = req.cookies.newSession

    if (sessionId === undefined){
        res.redirect('/login?message=Please Login')
        return;
    }
    let sessionData = await business.getSessionData(sessionId)

    if (sessionData === null){
        res.clearCookie('newSession');
        res.redirect('/login?message=Session Expired');
        return;
    } 
    
    req.username = sessionData.username;
    req.userRole = sessionData.role;
    next();
}

async function securityLog(req, res, next){
    let username = "unknown"
    let sessionId = req.cookies.newSession
    if (sessionId){
        let sessionData = await business.getSessionData(sessionId)
        if (sessionData){
            username = sessionData.username
        }
    }
    await business.addSecurityLog(
        new Date().toISOString(),
        username,
        req.originalUrl,
        req.method
    )
    next();
}
app.use(securityLog);

app.get("/", authenticate, async (req, res) => {
    let employeePage = await business.listEmployees()
    res.render('employeeList', {
        employeeList: employeePage,
        username: req.username
    })
});

app.get("/employees/:employeeId", authenticate, async (req, res) => {
    let employeeId = req.params.employeeId;
    let allowEdit = (req.userRole === 'admin')
    
    let details = await business.employeeInformation(employeeId);
    let schedule = await business.viewEmployeeSchedule(employeeId);

    let showSchedule = [];
    for (let timing of schedule) {
        let startTime = timing[1];
        let startHour = parseInt(startTime.split(":")[0]);

        let beforeNoon = startHour < 12;

        showSchedule.push({
            date: timing[0],
            startTime: timing[1],
            endTime: timing[2],
            beforeNoon: beforeNoon
        });
    }

    for (let i = 0; i < showSchedule.length; i++) {
        for (let j = i + 1; j < showSchedule.length; j++) {
            if (showSchedule[i].date > showSchedule[j].date) {
                let later = showSchedule[i];
                showSchedule[i] = showSchedule[j];
                showSchedule[j] = later;
            }
            else if (showSchedule[i].date === showSchedule[j].date) {
                if (showSchedule[i].startTime > showSchedule[j].startTime) {
                    let later = showSchedule[i];
                    showSchedule[i] = showSchedule[j];
                    showSchedule[j] = later;
                }
            }
        }
    }
    
    res.render('employeeDetails', {
        photo: details.photo,
        name: details.name,
        phone: details.phone,
        shifts: showSchedule,
        _id: employeeId,
        username: req.username,
        allowEdit: allowEdit
    });
});

app.get("/edit/:employeeId", authenticate, async (req, res) => {
    if (req.userRole !== 'admin') {
        res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
        return;
    }
    
    let employeeId = req.params.employeeId;
    let details = await business.employeeInformation(employeeId);

    res.render('editEmployee', {
        name: details.name,
        phone: details.phone,
        _id: employeeId,
        username: req.username
    });
});

app.post('/edit/:employeeId', authenticate, async (req, res) => {
    if (req.userRole !== 'admin') {
        res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
        return;
    }
    
    let employeeId = req.params.employeeId;
    let { name, phone } = req.body;

    let validate = await business.updateEmployeeDetails(employeeId, { name, phone });

    if (validate === "Empty") {
        res.status(400).render('error', { message: "Name must be non-empty" });
        return;
    } 
    
    if (validate === "Invalid") {
        res.status(400).render('error', { message: "Phone number invalid" });
        return;
    }
    
    res.render('success', { message: "Employee successfully updated" });
});

async function handleUploadError(req, res, errorMessage) {
    let employeeId = req.params.employeeId
    let details = await business.employeeInformation(employeeId)
    let documents = await business.getEmployeeDocuments(employeeId)
    let docCount = documents.length
    let remainingSlots = 5 - docCount
    
    res.render('employeeDocuments', {
        employeeId: employeeId,
        employeeName: details.name,
        documents: documents,
        username: req.username,
        docCount: docCount,
        remainingSlots: remainingSlots,
        errorMessage: errorMessage
    })
}

async function processUpload(req, res) {
    let employeeId = req.params.employeeId
    
    if (!req.file) {
        return handleUploadError(req, res, "No file selected. Please choose a PDF file.")
    }
    
    let result = await business.uploadEmployeeDocument(employeeId, req.file)
    
    if (result.success === false) {
        return handleUploadError(req, res, result.message)
    }
    
    res.redirect('/documents/' + employeeId)
}

app.get("/documents/:employeeId", authenticate, async (req, res) => {
    if (req.userRole !== 'admin') {
        res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
        return;
    }
    
    let employeeId = req.params.employeeId;
    let details = await business.employeeInformation(employeeId);
    
    if (details === "Employee not found") {
        res.status(404).render('error', { message: 'Employee not found' });
        return;
    }
    
    let documents = await business.getEmployeeDocuments(employeeId);
    let docCount = documents.length;
    let remainingSlots = 5 - docCount;
    
    res.render('employeeDocuments', {
        employeeId: employeeId,
        employeeName: details.name,
        documents: documents,
        username: req.username,
        docCount: docCount,
        remainingSlots: remainingSlots,
        errorMessage: null
    });
});

app.post("/documents/:employeeId/upload", authenticate, (req, res, next) => {
    upload.single('document')(req, res, function(err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return handleUploadError(req, res, "File too large. Maximum size is 2MB.")
            }
            return handleUploadError(req, res, "Upload error: " + err.message)
        }
        
        processUpload(req, res)
    })
})

app.post("/documents/:employeeId/delete/:docId", authenticate, async (req, res) => {
    if (req.userRole !== 'admin') {
        res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
        return;
    }
    
    let employeeId = req.params.employeeId;
    let docId = req.params.docId;
    
    await business.deleteEmployeeDocument(employeeId, docId);
    
    res.redirect('/documents/' + employeeId);
});

app.get("/documents/:employeeId/view/:docId", authenticate, async (req, res) => {
    let employeeId = req.params.employeeId;
    let docId = req.params.docId;
    
    let doc = await business.getEmployeeDocument(employeeId, docId);
    
    if (!doc) {
        res.status(404).render('error', { message: 'Document not found' });
        return;
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + doc.metadata.originalName + '"');
    res.send(doc.buffer);
});


app.get('/login', (req,res)=>{
    res.render('login', {layout: undefined, message: req.query.message})
})

app.post('/login', async (req,res)=>{
    let username = req.body.username
    let password = req.body.password
    
    let valid = await business.checkLogin(username,password)
    
    if (valid && valid.status === 'locked') {
        res.redirect('/login?message=Account is locked.')
        return;
    }
    if (valid && valid.require2FA === true) {
        res.render('twoFACode', { 
            layout: undefined, 
            username: username,
            message: "Enter the 6-digit code sent to your email"
        })
        return;
    }
    res.redirect('/login?message=Invalid username or password')
})

app.post('/verification', async (req, res) => {
    let username = req.body.username
    let code = req.body.code
    
    let result = await business.verify2FACode(username, code)
    
    if (result.status === 'locked') {
        res.redirect('/login?message=Account is locked.')
        return
    }
    
    if (result.success === false) {
        res.render('twoFACode', {
            layout: undefined,
            username: username,
            message: result.message
        })
        return
    }
    
    let sessionKey = await business.startSession({
        username: result.user.username,
        role: result.user.role
    })
    
    res.cookie('newSession', sessionKey)
    res.redirect('/')
})

app.get('/logout', async (req,res) => {
    let sessionId = req.cookies.newSession
    if (sessionId !== undefined){
        await business.deleteSession(sessionId)
        res.clearCookie('newSession')
    }
    res.redirect('/login?message=You have been logged out')
})

app.listen(8000, () => {
    console.log('Server is running');
});