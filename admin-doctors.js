// admin-doctors.js

let doctors = [
  { name: "Dr. Michael Chen",    email: "doctor@medintel.com",  department: "Cardiology", specialization: "Cardiologist",  status: "Active" },
  { name: "Dr. Emily Rodriguez", email: "doctor2@medintel.com", department: "Pediatrics", specialization: "Pediatrician", status: "Active" }
];

/* ── RENDER TABLE ── */
function renderDoctors() {
  const tbody = document.getElementById('doctorBody');

  if (!doctors.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No doctors found.</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.map((d, i) => `
    <tr>
      <td>
        <span class="row-icon doctor-icon">&#9877;</span>
        <strong>${d.name}</strong>
      </td>
      <td>${d.email}</td>
      <td><span class="badge badge-dept">${d.department}</span></td>
      <td>${d.specialization}</td>
      <td><span class="badge badge-active">Active</span></td>
      <td>
        <button class="btn btn-red" onclick="removeDoctor(${i})">
          &#128465; Remove
        </button>
      </td>
    </tr>
  `).join('');
}

/* ── REMOVE ── */
function removeDoctor(i) {
  if (confirm(`Remove ${doctors[i].name}?`)) {
    doctors.splice(i, 1);
    renderDoctors();
  }
}

/* ── MODAL ── */
function openModal() {
  document.getElementById('staffModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('staffModal').classList.add('hidden');
  clearForm();
}

function clearForm() {
  ['fullName','specialization','email','password'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('department').value = '';
  document.getElementById('role').value = 'Doctor';
  ['nameError','emailError','passwordError','departmentError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

/* ── VALIDATION & CREATE ── */
function createStaff() {
  let valid = true;

  const name   = document.getElementById('fullName').value.trim();
  const dept   = document.getElementById('department').value;
  const email  = document.getElementById('email').value.trim();
  const pass   = document.getElementById('password').value;
  const spec   = document.getElementById('specialization').value.trim();
  const role   = document.getElementById('role').value;

  // Reset errors
  ['nameError','emailError','passwordError','departmentError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  if (!name) {
    document.getElementById('nameError').textContent = 'Full name is required.';
    valid = false;
  }
  if (!dept) {
    document.getElementById('departmentError').textContent = 'Please select a department.';
    valid = false;
  }
  if (!email || !email.includes('@')) {
    document.getElementById('emailError').textContent = 'A valid email is required.';
    valid = false;
  }
  if (!pass || pass.length < 6) {
    document.getElementById('passwordError').textContent = 'Password must be at least 6 characters.';
    valid = false;
  }

  if (!valid) return;

  if (role === 'Doctor') {
    doctors.push({ name, email, department: dept, specialization: spec || '—', status: 'Active' });
    renderDoctors();
    alert(`Doctor account created for ${name}`);
  } else {
    alert(`Nurse account created for ${name} — go to the Nurses tab to see them.`);
  }

  closeModal();
}

/* ── INIT ── */
renderDoctors();
