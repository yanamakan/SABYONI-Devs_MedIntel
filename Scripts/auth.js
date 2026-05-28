const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_BASE = "https://sabyoni-devs-med-intel.vercel.app";

// ── Helper: send email via our API ──
async function sendEmail(payload) {
  try {
    await fetch(`${API_BASE}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const messageEl = document.getElementById("message");

  if (!email || !password) {
    showMessage(messageEl, "Please enter your email and password.", "error");
    return;
  }

  showMessage(messageEl, "Logging in...", "info");

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(messageEl, "Invalid email or password.", "error");
    return;
  }

  const userId = data.user.id;

  const { data: userData, error: roleError } = await client
    .from("users")
    .select("role, full_name, phone, must_reset_password, two_fa_enabled")
    .eq("id", userId)
    .single();

  if (roleError || !userData) {
    showMessage(messageEl, "Could not fetch user role.", "error");
    return;
  }

  // Check if account is active
  const { data: activeCheck } = await client
    .from("users")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (activeCheck && activeCheck.is_active === false) {
    showMessage(messageEl, "Your account has been deactivated. Contact your administrator.", "error");
    await client.auth.signOut();
    return;
  }

  const role = userData.role;

  // ── Fetch name and department based on role ──
  let userName = email.split("@")[0];
  let department = "";

  if (role === "patient") {
    const { data: patientData } = await client
      .from("patients")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    if (patientData) {
      userName = `${patientData.first_name || ""} ${patientData.last_name || ""}`.trim() || email.split("@")[0];
    }
  } else if (role === "nurse") {
    const { data: nurseData } = await client
      .from("nurses")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    if (nurseData) {
      userName = `${nurseData.first_name} ${nurseData.last_name}`.trim();
      department = "Emergency Department";
    }
  } else if (role === "doctor") {
    const { data: doctorData } = await client
      .from("doctors")
      .select("first_name, last_name, specialization")
      .eq("user_id", userId)
      .single();
    if (doctorData) {
      userName = `Dr. ${doctorData.first_name} ${doctorData.last_name}`.trim();
      department = doctorData.specialization || "General Practice";
    }
  } else if (role === "admin") {
    const { data: adminData } = await client
      .from("admins")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    if (adminData) {
      userName = `${adminData.first_name} ${adminData.last_name}`.trim();
      department = "Administration";
    }
  } else if (role === "superadmin") {
    userName = "Super Admin";
    department = "Administration";
  }

  // ── Save session ──
  const sessionData = {
    id: userId,
    email,
    role,
    name: userName,
    department,
  };
  sessionStorage.setItem("userRole", role);
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("userName", userName);
  sessionStorage.setItem("medintel_user", JSON.stringify(sessionData));

  // ── Check: first login (staff only) ──
  if (userData.must_reset_password && role !== "patient") {
    // Send first-login email (non-blocking)
    sendEmail({ type: "first_login", email, name: userName });
    // Store email for reset page
    sessionStorage.setItem("reset_email", email);
    sessionStorage.setItem("reset_reason", "first_login");
    showMessage(messageEl, "First login detected. Redirecting to password reset...", "info");
    setTimeout(() => window.location.href = "reset-password.html", 1200);
    return;
  }

  // ── Check: 2FA enabled ──
  if (userData.two_fa_enabled) {
    // Send 2FA OTP
    showMessage(messageEl, "Sending verification code to your email...", "info");
    const otpRes = await fetch(`${API_BASE}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "2fa", email, name: userName }),
    });
    const otpData = await otpRes.json();
    if (!otpData.success) {
      showMessage(messageEl, "Failed to send verification code. Try again.", "error");
      return;
    }
    sessionStorage.setItem("twofa_email", email);
    sessionStorage.setItem("twofa_redirect", getRedirectPage(role));
    showMessage(messageEl, "Verification code sent! Redirecting...", "success");
    setTimeout(() => window.location.href = "verify-otp.html", 1000);
    return;
  }

  // ── Normal redirect ──
  const page = getRedirectPage(role);
  if (page) {
    showMessage(messageEl, "Login successful! Redirecting...", "success");
    setTimeout(() => window.location.href = page, 800);
  } else {
    showMessage(messageEl, "Unknown role. Contact your administrator.", "error");
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
    showMessage(messageEl, "Please fill in all fields.", "error");
    return;
  }

  if (password !== confirm) {
    showMessage(messageEl, "Passwords do not match.", "error");
    return;
  }

  showMessage(messageEl, "Creating your account...", "info");

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    showMessage(messageEl, error.message, "error");
    return;
  }

  if (!data.user || !data.user.id) {
    showMessage(messageEl, "This email may already be registered. Please try logging in.", "error");
    return;
  }

  const userId = data.user.id;

  const { error: userInsertError } = await client
    .from("users")
    .insert([{ id: userId, email, role: "patient", must_reset_password: false }]);

  if (userInsertError) {
    showMessage(messageEl, "Error saving user: " + userInsertError.message, "error");
    return;
  }

  const { error: patientInsertError } = await client
    .from("patients")
    .insert([{ user_id: userId, first_name: firstName, last_name: lastName, dob, phone }]);

  if (patientInsertError) {
    showMessage(messageEl, "Error saving patient info: " + patientInsertError.message, "error");
    return;
  }

  // Send welcome email (non-blocking)
  sendEmail({ type: "welcome", email, name: fullName });

  sessionStorage.setItem("userRole", "patient");
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("userName", fullName);
  sessionStorage.setItem("medintel_user", JSON.stringify({
    id: userId,
    email,
    role: "patient",
    name: fullName,
    department: "",
  }));

  showMessage(messageEl, "Account created! Redirecting...", "success");
  setTimeout(() => window.location.href = "patient.html", 800);
}

// ===== HELPERS =====
function getRedirectPage(role) {
  const redirectMap = {
    superadmin: "super-admin.html",
    admin: "admin2.html",
    doctor: "doctor-dash.html",
    nurse: "nurse.html",
    patient: "patient.html",
  };
  return redirectMap[role] || null;
}

function showMessage(el, text, type) {
  const colors = {
    error: "#ef4444",
    info: "#3b82f6",
    success: "#16a34a",
  };
  el.style.cssText = `color:${colors[type]};text-align:center;margin-top:12px;font-size:14px;`;
  el.textContent = text;
}