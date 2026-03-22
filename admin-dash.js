const doctors = [
    {
        name: "Dr. Michael Chen",
        email: "doctor@medintel.com",
        department: "Cardiology",
        specialization: "Cardiologist",
        status: "Active"
    },
    {
        name: "Dr. Emily Rodriguez",
        email: "doctor2@medintel.com",
        department: "Pediatrics",
        specialization: "Pediatrician",
        status: "Active"
    }
];

const nurses = [
    {
        name: "Alice Williams",
        email: "nurse@medintel.com",
        department: "Emergency",
        status: "Active"
    },
    {
        name: "Tom Jackson",
        email: "nurse2@medintel.com",
        department: "Cardiology",
        status: "Active"
    }
];

let currentTab = "doctors";

function renderStaff(data){
    const tbody = document.getElementById("staff-body");
    tbody.innerHTML= "";/*avoids duplication of data*/

    /*loops trhough each data in the data array*/
    data.forEach((person,index)=>{
        //creates a new table row 
        const  row = document.createElement("tr");

        //checks for the active tab
        if(currentTab === "doctors"){

            row.innerHTML = `
            <td>${person.name}</td> 
                <!-- Insert doctor's name -->

                <td>${person.email}</td> 
                <!-- Insert email -->

                <td><span class="badge blue">${person.department}</span></td> 
                <!-- Department styled as badge -->

                <td>${person.specialization}</td> 
                <!-- Only doctors have specialization -->

                <td><span class="badge green">${person.status}</span></td> 
                <!-- Status badge -->

                <td>
                    <button class="remove" onclick="removeStaff(${index})">
                        Remove
                    </button>
                </td>
                <!-- Button calls remove function -->
            `
        }
        else{
            row.innerHTML=`
                <td>${person.name}</td>
                <!--inserts nurses name-->
                <td>${person.email}</td>

                <td><span class="badge blue">${person.department}</span></td>

                <td><span class="badge green">${person.status}</span></td>

                <td>
                    <button class="remove" onclick="removeStaff(${index})">
                        Remove
                    </button>
                </td>
            `;
        }
        tbody.appendChild(row);
    })

}

//function to remove staff

function removeStaff(index){
    if(currentTab === "doctors"){

        doctors.splice(index, 1);
        //removes 1 item at position "index" from doctors array

        renderStaff(doctors);
        // Re-render updated doctors list , basically going back to the rerender doctors function
    }
    else{
        nurses.splice(index, 1);
        //removes from nurses array

        renderedStaff(nurses);
        //goes back to re- render studd function
    }
}

//when doctors tab is clicked
document.getElementById("doctorsTab").addEventListener("click", () => {

    currentTab = "doctors";
    //update state

    renderedStaff(doctors);
    //shows doctor tab

    setActiveTab("doctorsTab");
    //highlights the tab
});

// When Nurses tab is clicked
document.getElementById("nursesTab").addEventListener("click", () => {

    currentTab = "nurses"; 
    // Switch to nurses

    renderStaff(nurses); 
    // Show nurses data

    setActiveTab("nursesTab"); 
    // Highlight tab
});

function setActiveTab(activeId) {

    // Remove "active" class from both tabs
    document.getElementById("doctorsTab").classList.remove("active");
    document.getElementById("nursesTab").classList.remove("active");

    // Add "active" class to clicked tab
    document.getElementById(activeId).classList.add("active");
}


renderStaff(doctors);
// When page loads → show doctors first

document.querySelector(".add-btn").addEventListener("click", ()=>{
    document.getElementById("staffModal").style.display = "flex";
})

document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("staffModal").style.display = "none";
});

document.getElementById("cancelModal").addEventListener("click", () => {
    document.getElementById("staffModal").style.display = "none";
});

document.getElementById("createStaff").addEventListener("click", () => {
    //gets the values
    const role = document.getElementById("role").value;
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const department = document.getElementById("department").value;
    const specialization = document.getElementById("specialization").value;
    //removes previous errors
    clearErrors();

    let isValid = true;

    // =====================
    // NAME VALIDATION
    // =====================
    if (name.value.trim() === "") {
        showError(name, "nameError", "Full name is required");
        isValid = false;
    }

    // =====================
    // EMAIL VALIDATION
    // =====================
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;

    if (!email.value.match(emailPattern)) {
        showError(email, "emailError", "Enter a valid email");
        isValid = false;
    }

    // =====================
    // DEPARTMENT VALIDATION
    // =====================
    if (department.value === "Select department") {
        showError(department, "departmentError", "Select a department");
        isValid = false;
    }

    // =====================
    // PASSWORD VALIDATION
    // =====================
    if (password.value.length < 6) {
        showError(password, "passwordError", "Password must be at least 6 characters");
        isValid = false;
    }

    // =====================
    // ROLE-BASED VALIDATION
    // =====================
    if (role === "Doctor" && specialization.value.trim() === "") {
        showError(specialization, "specError", "Specialization required for doctors");
        isValid = false;
    }

    // Stop if invalid
    if (!isValid) return;

    // =====================
    // CREATE STAFF (same logic)
    // =====================
    let newStaff;

    if (role === "Doctor") {
        newStaff = {
            name: name.value,
            email: email.value,
            department: department.value,
            specialization: specialization.value,
            status: "Active"
        };

        doctors.push(newStaff);
        renderStaff(doctors);

    } else {
        newStaff = {
            name: name.value,
            email: email.value,
            department: department.value,
            status: "Active"
        };

        nurses.push(newStaff);
        renderStaff(nurses);
    }

    // Close modal
    document.getElementById("staffModal").style.display = "none";
});

/*Remeber that a email notification needs to be sent to the staff members */

function validateForm() {

    const role = document.getElementById("role").value;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value;
    const department = document.getElementById("department").value;
    const specialization = document.getElementById("specialization").value.trim();
    const password = document.getElementById("password").value;

    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;

    let isValid = true;

    if (!name) isValid = false;
    if (!email.match(emailPattern)) isValid = false;
    if (department === "Select department") isValid = false;
    if (password.length < 6) isValid = false;

    if (role === "Doctor" && !specialization) isValid = false;

    // Enable or disable button
    document.getElementById("createStaff").disabled = !isValid;
}

document.querySelectorAll("input, select").forEach(input => {
    input.addEventListener("input", validateForm);
});

// Load saved data or use default


