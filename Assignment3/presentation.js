let express = require('express');
let app = new express()

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded())

let business = require('./business')

const handlebars = require('express-handlebars')

app.set('views', __dirname + "/templates")
app.set('view engine', 'handlebars')
app.engine('handlebars', handlebars.engine())

app.use('/static', express.static(__dirname + "/static"))



app.get("/", async (req, res) => {
    let employeePage = await business.listEmployees()
    res.render('employeeList',
        { employeeList: employeePage })
});


app.get("/edit/:employeeId", async (req, res) => {
    let employeeId = req.params.employeeId;
    let details = await business.employeeInformation(employeeId);

    res.render('editEmployee', {
        name: details.name,
        phone: details.phone,
        employeeId: employeeId
    });
});

app.get("/employees/:employeeId", async (req, res) => {
    let employeeId = req.params.employeeId;

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
        name: details.name,
        phone: details.phone,
        shifts: showSchedule,
        employeeId: employeeId
    });
});

app.post('/edit/:employeeId', async (req, res) => {
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
app.listen(8000, () => {
    console.log('Server is running');
});