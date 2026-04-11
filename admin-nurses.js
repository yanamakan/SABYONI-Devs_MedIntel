// admin-nurses.js

let nurses = [
  { name: "Alice Williams", email: "nurse@medintel.com",  department: "Emergency",  status: "Active" },
  { name: "Tom Jackson",    email: "nurse2@medintel.com", department: "Cardiology", status: "Active" }
];

/* ── RENDER ── */
function renderNurses() {
  const tbody = document.getElementById('nurseBody');

  if (!nurses.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No nurses found.</td></tr>';
    return;
  }

  tbody.innerHTML = nurses.map((n, i) => `
    <tr>
      <td>
        <span class="row-icon nurse-icon">&#128100;</span>
        <strong>${n.name}</strong>
      </td>
      <td>${n.email}</td>
      <td><span class="badge badge-dept">${n.department}</span></td>
      <td><span class="badge badge-active">Active</span></td>
      <td>
        <button class="btn btn-red" onclick="removeNurse(${i})">
          &#128465; Remove
        </button>
      </td>
    </tr>
  `).join('');
}

/* ── REMOVE ── */
function removeNurse(i) {
  if (confirm(`Remove ${nurses[i].name}?`)) {
    nurses.splice(i, 1);
    renderNurses();
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
  ['fullName', 'email', 'password'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('department').value = '';
  ['nameError', 'emailError', 'passwordError', 'departmentError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

/* ── CREATE ── */
function createStaff() {
  let valid = true;

  const name  = document.getElementById('fullName').value.trim();
  const dept  = document.getElementById('department').value;
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  const role  = document.getElementById('role').value;

  ['nameError', 'emailError', 'passwordError', 'departmentError'].forEach(id => {
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

  if (role === 'Nurse') {
    nurses.push({ name, email, department: dept, status: 'Active' });
    renderNurses();
    alert(`Nurse account created for ${name}`);
  } else {
    alert(`Doctor account created for ${name} — go to the Doctors tab to see them.`);
  }

  closeModal();
}

/* ── INIT ── */
renderNurses();
