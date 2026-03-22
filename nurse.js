// Get elements from HTML
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