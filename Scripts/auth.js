const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const messageEl = document.getElementById("message");

  if (!email || !password) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Please enter your email and password.";
    return;
  }

  messageEl.style.cssText = "color:#3b82f6;text-align:center;margin-top:12px;font-size:14px;";
  messageEl.textContent = "Logging in...";

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Invalid email or password.";
    return;
  }

  const userId = data.user.id;

  const { data: userData, error: roleError } = await client
    .from("users")
    .select("role, full_name, phone")
    .eq("id", userId)
    .single();

  if (roleError || !userData) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Could not fetch user role.";
    return;
  }

  // Check if account is active
  const { data: activeCheck } = await client
    .from('users')
    .select('is_active')
    .eq('id', userId)
    .single();

  if (activeCheck && activeCheck.is_active === false) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Your account has been deactivated. Contact your administrator.";
    await client.auth.signOut();
    return;
  }

  const role = userData.role;

  // ── Fetch name and department based on role ──
  let userName = email.split('@')[0];
  let department = '';

  if (role === 'patient') {
    const { data: patientData } = await client
      .from('patients')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    if (patientData) {
      userName = `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim() || email.split('@')[0];
    }
  } else if (role === 'nurse') {
    const { data: nurseData } = await client
      .from('nurses')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    if (nurseData) {
      userName = `${nurseData.first_name} ${nurseData.last_name}`.trim();
      department = 'Emergency Department';
    }
  } else if (role === 'doctor') {
    const { data: doctorData } = await client
      .from('doctors')
      .select('first_name, last_name, specialization')
      .eq('user_id', userId)
      .single();
    if (doctorData) {
      userName = `Dr. ${doctorData.first_name} ${doctorData.last_name}`.trim();
      department = doctorData.specialization || 'General Practice';
    }
  } else if (role === 'admin') {
    const { data: adminData } = await client
      .from('admins')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    if (adminData) {
      userName = `${adminData.first_name} ${adminData.last_name}`.trim();
      department = 'Administration';
    }
  } else if (role === 'superadmin') {
    userName = 'Super Admin';
    department = 'Administration';
  }

  // ── Save session — NOW INCLUDES id ──
  sessionStorage.setItem('userRole', role);
  sessionStorage.setItem('userEmail', email);
  sessionStorage.setItem('userId', userId);
  sessionStorage.setItem('userName', userName);
  sessionStorage.setItem('medintel_user', JSON.stringify({
    id: userId,        // ← THE FIX — was missing before
    email,
    role,
    name: userName,
    department,
  }));

  const redirectMap = {
    superadmin: 'super-admin.html',
    admin: 'admin2.html',
    doctor: 'doctor-dash.html',
    nurse: 'nurse.html',
    patient: 'patient.html',
  };

  const page = redirectMap[role];

  if (page) {
    messageEl.style.cssText = "color:#16a34a;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Login successful! Redirecting...";
    setTimeout(() => window.location.href = page, 800);
  } else {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Unknown role. Contact your administrator.";
  }
}

// ===== SIGN UP =====
async function handleSignUp() {
  const fullName  = document.getElementById("signupName").value.trim();
  const firstName = fullName.split(" ")[0];
  const lastName  = fullName.split(" ").slice(1).join(" ") || "";
  const email     = document.getElementById("signupEmail").value.trim();
  const phone     = document.getElementById("signupPhone").value.trim();
  const dob       = document.getElementById("signupDob").value;
  const password  = document.getElementById("signupPassword").value.trim();
  const confirm   = document.getElementById("Confirm_signupPassword").value.trim();
  const messageEl = document.getElementById("message");

  if (!fullName || !email || !phone || !dob || !password || !confirm) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Please fill in all fields.";
    return;
  }

  if (password !== confirm) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Passwords do not match.";
    return;
  }

  messageEl.style.cssText = "color:#3b82f6;text-align:center;margin-top:12px;font-size:14px;";
  messageEl.textContent = "Creating your account...";

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = error.message;
    return;
  }

  if (!data.user || !data.user.id) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "This email may already be registered. Please try logging in.";
    return;
  }

  const userId = data.user.id;

  // Insert into users table
  const { error: userInsertError } = await client
    .from("users")
    .insert([{ id: userId, email, role: "patient" }]);

  if (userInsertError) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Error saving user: " + userInsertError.message;
    return;
  }

  // Insert into patients table
  const { error: patientInsertError } = await client
    .from("patients")
    .insert([{ user_id: userId, first_name: firstName, last_name: lastName, dob, phone }]);

  if (patientInsertError) {
    messageEl.style.cssText = "color:#ef4444;text-align:center;margin-top:12px;font-size:14px;";
    messageEl.textContent = "Error saving patient info: " + patientInsertError.message;
    return;
  }

  // ── Save session with id and redirect immediately ──
  sessionStorage.setItem('userRole', 'patient');
  sessionStorage.setItem('userEmail', email);
  sessionStorage.setItem('userId', userId);
  sessionStorage.setItem('userName', fullName);
  sessionStorage.setItem('medintel_user', JSON.stringify({
    id: userId,        // ← included from the start
    email,
    role: 'patient',
    name: fullName,
    department: '',
  }));

  messageEl.style.cssText = "color:#16a34a;text-align:center;margin-top:12px;font-size:14px;";
  messageEl.textContent = "Account created! Redirecting...";

  // Redirect directly — no email confirmation needed
  setTimeout(() => window.location.href = 'patient.html', 800);
}