let express = require('express');
let app = new express()

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true }))

let business = require('./business')

const handlebars = require('express-handlebars')
const cookieParser = require('cookie-parser')
app.use(cookieParser())


app.set('views', __dirname + "/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())

app.use('/static', express.static(__dirname + "/static"))


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
        return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
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
        return res.status(403).render('error', { message: 'Access denied. Admin privileges required.' });
    }
    
    let employeeId = req.params.employeeId;
    let { name, phone } = req.body;

    let validate = await business.updateEmployeeDetails(employeeId, { name, phone });

    if (validate === "Empty") {
        return res.status(400).render('error', { message: "Name must be non-empty" });
    } else if (validate === "Invalid") {
        return res.status(400).render('error', { message: "Phone number invalid" });
    }
    res.render('success', { message: "Employee successfully updated" });
});

app.get('/login', (req,res)=>{
    res.render('login', {layout: undefined, message: req.query.message})
})

app.post('/login', async (req,res)=>{
    let username = req.body.username
    let password = req.body.password
    
    let valid = await business.checkLogin(username,password)
    
    if (valid === undefined){
        res.redirect('/login?message=Invalid username or password');
        return;
    }
    let userRole = await business.getRole(username);
    let sessionKey = await business.startSession({username: username, role: userRole})

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