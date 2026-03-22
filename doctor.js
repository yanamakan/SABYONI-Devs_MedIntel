/*placeholder until API intergration*/

function renderPatients(patients) { /*creates the patient function*/
    const queue = document.querySelector(".queue");
    queue.innerHTML = ""; // clear old data

    patients.forEach(patient => {/*loops througth each patient in the array for now*/
        const card = document.createElement("div");
        card.classList.add("patient");/*adds css class to the div*/
    
    /*Important parts:
    ${patient.name}
    Inserts the patient’s name dynamically
    ${patient.priority}
    Used twice:
    as a class → for color styling
    as text → shows “high”, “low”, etc.*/
        card.innerHTML = `
            <h4>${patient.name} <span class="tag ${patient.priority}">${patient.priority}</span></h4>
            <p>${patient.condition}</p>
            <small>Last visit: ${patient.lastVisit}</small>
        `;

        card.addEventListener("click", () => showDetails(patient));/*when the patient on the left is clicked it shows the info on the side*/

        queue.appendChild(card);/*adds card to the queue container*/
    });/*ends the loop and goes to the next patient*/
}/*end of function*/

/*1. Get container (.queue)
2. Clear old content
3. Loop through patients
4. Create a card for each
5. Fill it with data
6. Add click behavior
7. Show it on screen*/

/*later we will bring in the api/ai but the function will stay the same*/

let patients = [
    {
        name: "James Wilson",
        priority: "medium",
        condition: "Hypertension",
        lastVisit: "2026-03-10"
    }
];