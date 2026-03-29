/*// Get elements from HTML
const addBtn = document.getElementById("addBtn");
const recordsDiv = document.getElementById("records");

const vitalsCount = document.getElementById("vitalsCount");
const alertsCount = document.getElementById("alertsCount");
const taskCheckboxes = document.querySelectorAll(".taskCheck");

const addTaskBtn = document.getElementById("addTaskBtn");
const newTaskInput = document.getElementById("newTask");
const tasksList = document.getElementById("tasksList");

// Store data in array
let records = [];

// Load from localStorage when page loads
let tasks = JSON.parse(localStorage.getItem("tasksList")) || [];

// Load tasks
window.onload = function () {

    tasks.forEach(task => {
        createTask(task.text, task.completed);
    });

    updateTaskCount();
};

// Button click event
addBtn.addEventListener("click", function () {

    // Get input values
    const name = document.getElementById("name").value;
    const temp = document.getElementById("temp").value;
    const bp = document.getElementById("bp").value;
    const hr = document.getElementById("hr").value;
    const spo2 = document.getElementById("spo2").value;

    // ===== VALIDATION =====
    if (!name || !temp || !bp || !hr || !spo2) {
        alert("Please fill all fields!");
        return;
    }

    // Create object
    const patient = {
        name,
        temp,
        bp,
        hr,
        spo2,
        time: new Date().toLocaleTimeString()
    };

    // Add to array
    records.push(patient);

    // Save to localStorage
    localStorage.setItem("patients", JSON.stringify(records));

    // Update UI
    displayRecords();

    // Clear form
    document.getElementById("name").value = "";
    document.getElementById("temp").value = "";
    document.getElementById("bp").value = "";
    document.getElementById("hr").value = "";
    document.getElementById("spo2").value = "";
});

addTaskBtn.addEventListener("click", function () {

    const taskText = newTaskInput.value.trim();

    if (taskText === "") {
        alert("Enter a task!");
        return;
    }

    // Add to array
    tasks.push({
        text: taskText,
        completed: false
    });

    // Save
    localStorage.setItem("tasksList", JSON.stringify(tasks));

    // Show on screen
    createTask(taskText, false);

    // Clear input
    newTaskInput.value = "";

    updateTaskCount();
});

function createTask(text, completed) {

    const label = document.createElement("label");
    label.classList.add("task");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    checkbox.checked = completed;

    const span = document.createElement("span");
    span.textContent = " " + text;

    label.appendChild(checkbox);
    label.appendChild(span);

    // Strike-through if completed
    if (completed) {
        label.classList.add("completed");
    }

    // When checkbox changes
    checkbox.addEventListener("change", function () {

        label.classList.toggle("completed");

        // Update array
        tasks = tasks.map(task => {
            if (task.text === text) {
                task.completed = checkbox.checked;
            }
            return task;
        });

        localStorage.setItem("tasksList", JSON.stringify(tasks));

        updateTaskCount();
    });

    tasksList.appendChild(label);
}


// FUNCTION: Display records
function displayRecords() {

    recordsDiv.innerHTML = "";

    let alerts = 0;

    records.forEach((patient) => {

        // Check if patient is critical
        let isAlert = patient.temp > 38 || patient.hr > 100 || patient.spo2 < 95;

        if (isAlert) alerts++;

        // Create card
        const div = document.createElement("div");
        div.classList.add("record");

        // Change color if alert
        if (isAlert) {
            div.style.background = "#ffe5e5";
        } else {
            div.style.background = "#e6f7ec";
        }

        div.innerHTML = `
            <h3>${patient.name}</h3>
            <p>Temp: ${patient.temp}°C</p>
            <p>BP: ${patient.bp}</p>
            <p>HR: ${patient.hr} bpm</p>
            <p>SpO2: ${patient.spo2}%</p>
            <small>${patient.time}</small>
        `;

        recordsDiv.appendChild(div);
    });

    // Update dashboard numbers
    vitalsCount.textContent = records.length;
    alertsCount.textContent = alerts;
}

// Load saved tasks
const savedTasks = JSON.parse(localStorage.getItem("tasks")) || {};

taskCheckboxes.forEach((checkbox) => {
    const taskName = checkbox.dataset.task;

    if (savedTasks[taskName]) {
        checkbox.checked = true;
        checkbox.parentElement.classList.add("completed");
    }
});

taskCheckboxes.forEach((checkbox) => {

    checkbox.addEventListener("change", function () {

        const taskName = this.dataset.task;

        // Get saved tasks
        let tasks = JSON.parse(localStorage.getItem("tasks")) || {};

        // Save current state
        tasks[taskName] = this.checked;

        localStorage.setItem("tasks", JSON.stringify(tasks));

        // UI effect (strike-through)
        if (this.checked) {
            this.parentElement.classList.add("completed");
        } else {
            this.parentElement.classList.remove("completed");
        }

        updateTaskCount();
    });

});

function updateTaskCount() {
    const completed = tasks.filter(task => task.completed).length;

    document.querySelector(".card:nth-child(4) p").textContent = completed;
}

// Get elements
const toggleBtn = document.getElementById("toggleFormBtn");
const formContainer = document.getElementById("formContainer");

// Toggle form visibility
toggleBtn.addEventListener("click", function () {

    if (formContainer.style.display === "none") {
        formContainer.style.display = "block";
        toggleBtn.textContent = "Close";
    } else {
        formContainer.style.display = "none";
        toggleBtn.textContent = "Record Vitals";
    }

});
*/

// Get elements from HTML
const addBtn = document.getElementById("addBtn");
const recordsDiv = document.getElementById("records");

const vitalsCount = document.getElementById("vitalsCount");
const alertsCount = document.getElementById("alertsCount");
const taskCheckboxes = document.querySelectorAll(".taskCheck");

const addTaskBtn = document.getElementById("addTaskBtn");
const newTaskInput = document.getElementById("newTask");
const tasksList = document.getElementById("tasksList");

// AI Approval عناصر
const symptomsList = document.getElementById("symptoms-list");
const diagnosisList = document.getElementById("diagnosis-list");
const patientNameDisplay = document.getElementById("patient-name");

const approveBtn = document.getElementById("approveBtn");
const rejectBtn = document.getElementById("rejectBtn");
const editBtn = document.getElementById("editBtn");
const nextBtn = document.getElementById("nextBtn");

// Store data
let records = [];
let tasks = JSON.parse(localStorage.getItem("tasksList")) || [];

// =====================
// 🔥 AI PATIENT QUEUE
// =====================
let patientsQueue = [
  {
    name: "John Doe",
    symptoms: ["Fever", "Headache", "Fatigue"],
    aiDiagnosis: ["Malaria", "Flu", "COVID-19"],
    status: "Pending"
  },
  {
    name: "Sarah Smith",
    symptoms: ["Cough", "Chest pain"],
    aiDiagnosis: ["Bronchitis", "Pneumonia"],
    status: "Pending"
  },
  {
    name: "Mike Johnson",
    symptoms: ["Abdominal pain", "Nausea"],
    aiDiagnosis: ["Food Poisoning", "Gastritis"],
    status: "Pending"
  }
];

let currentIndex = 0;

// =====================
// LOAD EVERYTHING
// =====================
window.onload = function () {

    // Load tasks
    tasks.forEach(task => {
        createTask(task.text, task.completed);
    });

    updateTaskCount();

    // Load first AI patient
    loadPatient(currentIndex);
};

// =====================
// 🔥 LOAD AI PATIENT
// =====================
function loadPatient(index) {

    let patient = patientsQueue[index];

    patientNameDisplay.textContent = patient.name;

    symptomsList.innerHTML = "";
    diagnosisList.innerHTML = "";

    patient.symptoms.forEach(symptom => {
        let li = document.createElement("li");
        li.textContent = symptom;
        symptomsList.appendChild(li);
    });

    patient.aiDiagnosis.forEach(diagnosis => {
        let li = document.createElement("li");
        li.textContent = diagnosis;
        diagnosisList.appendChild(li);
    });
}

// =====================
// 🔥 NEXT PATIENT
// =====================
nextBtn.addEventListener("click", () => {

    currentIndex++;

    if (currentIndex >= patientsQueue.length) {
        alert("No more patients in queue ✅");
        currentIndex = patientsQueue.length - 1;
        return;
    }

    loadPatient(currentIndex);
});

// =====================
// 🔥 APPROVE / REJECT / EDIT
// =====================
approveBtn.addEventListener("click", () => {
    patientsQueue[currentIndex].status = "Approved";
    alert("Diagnosis Approved ✅");
});

rejectBtn.addEventListener("click", () => {
    patientsQueue[currentIndex].status = "Rejected";
    alert("Diagnosis Rejected ❌");
});

editBtn.addEventListener("click", () => {

    let newDiagnosis = prompt("Edit diagnosis (comma separated):");

    if (newDiagnosis) {

        let updated = newDiagnosis.split(",");
        diagnosisList.innerHTML = "";

        patientsQueue[currentIndex].aiDiagnosis = updated.map(d => d.trim());

        updated.forEach(item => {
            let li = document.createElement("li");
            li.textContent = item.trim();
            diagnosisList.appendChild(li);
        });
    }
});

// =====================
// ADD PATIENT RECORDS
// =====================
addBtn.addEventListener("click", function () {

    const name = document.getElementById("name").value;
    const temp = document.getElementById("temp").value;
    const bp = document.getElementById("bp").value;
    const hr = document.getElementById("hr").value;
    const spo2 = document.getElementById("spo2").value;

    if (!name || !temp || !bp || !hr || !spo2) {
        alert("Please fill all fields!");
        return;
    }

    const patient = {
        name,
        temp,
        bp,
        hr,
        spo2,
        time: new Date().toLocaleTimeString()
    };

    records.push(patient);
    localStorage.setItem("patients", JSON.stringify(records));

    displayRecords();

    document.getElementById("name").value = "";
    document.getElementById("temp").value = "";
    document.getElementById("bp").value = "";
    document.getElementById("hr").value = "";
    document.getElementById("spo2").value = "";
});

// =====================
// DISPLAY RECORDS
// =====================
function displayRecords() {

    recordsDiv.innerHTML = "";

    let alerts = 0;

    records.forEach((patient) => {

        let isAlert = patient.temp > 38 || patient.hr > 100 || patient.spo2 < 95;

        if (isAlert) alerts++;

        const div = document.createElement("div");
        div.classList.add("record");

        div.style.background = isAlert ? "#ffe5e5" : "#e6f7ec";

        div.innerHTML = `
            <h3>${patient.name}</h3>
            <p>Temp: ${patient.temp}°C</p>
            <p>BP: ${patient.bp}</p>
            <p>HR: ${patient.hr} bpm</p>
            <p>SpO2: ${patient.spo2}%</p>
            <small>${patient.time}</small>
        `;

        recordsDiv.appendChild(div);
    });

    vitalsCount.textContent = records.length;
    alertsCount.textContent = alerts;
}

// =====================
// TASK SYSTEM
// =====================
addTaskBtn.addEventListener("click", function () {

    const taskText = newTaskInput.value.trim();

    if (taskText === "") {
        alert("Enter a task!");
        return;
    }

    tasks.push({
        text: taskText,
        completed: false
    });

    localStorage.setItem("tasksList", JSON.stringify(tasks));

    createTask(taskText, false);
    newTaskInput.value = "";

    updateTaskCount();
});

function createTask(text, completed) {

    const label = document.createElement("label");
    label.classList.add("task");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed;

    const span = document.createElement("span");
    span.textContent = " " + text;

    label.appendChild(checkbox);
    label.appendChild(span);

    if (completed) {
        label.classList.add("completed");
    }

    checkbox.addEventListener("change", function () {

        label.classList.toggle("completed");

        tasks = tasks.map(task => {
            if (task.text === text) {
                task.completed = checkbox.checked;
            }
            return task;
        });

        localStorage.setItem("tasksList", JSON.stringify(tasks));

        updateTaskCount();
    });

    tasksList.appendChild(label);
}

function updateTaskCount() {
    const completed = tasks.filter(task => task.completed).length;
    document.querySelector(".card:nth-child(4) p").textContent = completed;
}

// =====================
// TOGGLE FORM
// =====================
const toggleBtn = document.getElementById("toggleFormBtn");
const formContainer = document.getElementById("formContainer");

toggleBtn.addEventListener("click", function () {

    if (formContainer.style.display === "none") {
        formContainer.style.display = "block";
        toggleBtn.textContent = "Close";
    } else {
        formContainer.style.display = "none";
        toggleBtn.textContent = "Record Vitals";
    }
});
