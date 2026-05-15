const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const messageEl = document.getElementById("message");

  if (!email || !password) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Please enter your email and password.";
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Invalid email or password.";
    return;
  }

  const userId = data.user.id;

  const { data: userData, error: roleError } = await client
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (roleError || !userData) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Could not fetch user role.";
    return;
  }

  if (userData.role === "patient") {
    const { data: patientData } = await client
      .from("patients")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();

    if (patientData) {
      sessionStorage.setItem(
        "userName",
        patientData.first_name + " " + patientData.last_name,
      );
    }
  }

  sessionStorage.setItem("userRole", userData.role);
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userId", userId);

  const redirectMap = {
    superadmin: "super-admin.html",
    admin: "admin2.html",
    doctor: "doctor-dash.html",
    nurse: "nurse.html",
    patient: "patient.html",
  };

  const page = redirectMap[userData.role];

  if (page) {
    messageEl.style.cssText =
      "color:#16a34a; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Login successful! Redirecting...";
    setTimeout(() => {
      window.location.href = page;
    }, 800);
  } else {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Unknown role. Contact your administrator.";
  }
}

// ===== SIGN UP =====
async function handleSignUp() {
  const fullName = document.getElementById("signupName").value.trim();
  const firstName = fullName.split(" ")[0];
  const lastName = fullName.split(" ").slice(1).join(" ") || "";
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const dob = document.getElementById("signupDob").value;
  const password = document.getElementById("signupPassword").value.trim();
  const confirm = document
    .getElementById("Confirm_signupPassword")
    .value.trim();
  const messageEl = document.getElementById("message");

  if (!fullName || !email || !phone || !dob || !password || !confirm) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Please fill in all fields.";
    return;
  }

  if (password !== confirm) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Passwords do not match.";
    return;
  }

  messageEl.style.cssText =
    "color:#3b82f6; text-align:center; margin-top:12px; font-size:14px;";
  messageEl.textContent = "Creating your account...";

  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = error.message;
    return;
  }

  const userId = data.user.id;

  const { error: userInsertError } = await client
    .from("users")
    .insert([{ id: userId, email: email, role: "patient" }]);

  if (userInsertError) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent = "Error saving user: " + userInsertError.message;
    return;
  }

  const { error: patientInsertError } = await client.from("patients").insert([
    {
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      dob: dob,
      phone: phone,
    },
  ]);

  if (patientInsertError) {
    messageEl.style.cssText =
      "color:#ef4444; text-align:center; margin-top:12px; font-size:14px;";
    messageEl.textContent =
      "Error saving patient info: " + patientInsertError.message;
    return;
  }

  sessionStorage.setItem("userRole", "patient");
  sessionStorage.setItem("userEmail", email);
  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("userName", fullName);

  messageEl.style.cssText =
    "color:#16a34a; text-align:center; margin-top:12px; font-size:14px;";
  messageEl.textContent = "Account created! Redirecting to your dashboard...";
  setTimeout(() => {
    window.location.href = "patient.html";
  }, 800);
}
