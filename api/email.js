import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Gmail transporter ──
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Generate 6-digit OTP ──
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Email templates ──
function getWelcomeEmail(name, email) {
  return {
    subject: "Welcome to MedIntel — Your Account Has Been Created",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#1e3a5f;font-size:28px;margin:0;">MedIntel</h1>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Intelligent Medical Support</p>
        </div>
        <div style="background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e3a5f;margin-top:0;">Welcome, ${name}! 👋</h2>
          <p style="color:#475569;line-height:1.6;">Your MedIntel patient account has been successfully created.</p>
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:14px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;color:#0369a1;font-size:14px;"><strong>Account Email:</strong> ${email}</p>
          </div>
          <p style="color:#475569;line-height:1.6;">You can now log in and access your patient portal to view appointments, medical records, and chat with ARIA, your AI health assistant.</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:28px;">If you did not create this account, please contact us immediately.</p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">© 2026 MedIntel · SABYONI Devs · POPIA Compliant</p>
      </div>
    `,
  };
}

function getFirstLoginEmail(name, email, tempPassword) {
  return {
    subject: "MedIntel — Your Account Has Been Created",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#1e3a5f;font-size:28px;margin:0;">MedIntel</h1>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Intelligent Medical Support</p>
        </div>
        <div style="background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e3a5f;margin-top:0;">Welcome to MedIntel, ${name}! 👋</h2>
          <p style="color:#475569;line-height:1.6;">Your staff account has been created by an administrator. Use the credentials below to log in for the first time.</p>
          
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#0369a1;font-size:14px;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin:0;color:#0369a1;font-size:14px;"><strong>🔑 Temporary Password:</strong> <span style="font-family:monospace;font-size:15px;background:#e0f2fe;padding:2px 8px;border-radius:4px;">${tempPassword}</span></p>
          </div>

          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;color:#b91c1c;font-size:14px;">⚠️ You will be required to set a new password immediately after logging in. This temporary password will no longer work after your first login.</p>
          </div>

          <p style="color:#475569;line-height:1.6;">Please log in at <a href="https://sabyoni-devs-med-intel.vercel.app/Dashboard/login.html" style="color:#2563eb;">MedIntel Portal</a> and follow the prompts to secure your account.</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:28px;">If you did not expect this email, contact your system administrator immediately.</p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">© 2026 MedIntel · SABYONI Devs · POPIA Compliant</p>
      </div>
    `,
  };
}

function getForgotPasswordEmail(name, otp) {
  return {
    subject: "MedIntel — Password Reset Code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#1e3a5f;font-size:28px;margin:0;">MedIntel</h1>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Intelligent Medical Support</p>
        </div>
        <div style="background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e3a5f;margin-top:0;">Password Reset Request</h2>
          <p style="color:#475569;line-height:1.6;">Hello <strong>${name}</strong>,</p>
          <p style="color:#475569;line-height:1.6;">We received a request to reset your MedIntel password. Use the code below:</p>
          <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background:#1e3a5f;color:#ffffff;font-size:36px;font-weight:bold;letter-spacing:10px;padding:18px 32px;border-radius:10px;">${otp}</div>
          </div>
          <div style="background:#fefce8;border-left:4px solid #eab308;padding:14px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;color:#854d0e;font-size:14px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
          </div>
          <p style="color:#475569;line-height:1.6;">Enter this code on the password reset page to set your new password.</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:28px;">If you did not request this, you can safely ignore this email.</p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">© 2026 MedIntel · SABYONI Devs · POPIA Compliant</p>
      </div>
    `,
  };
}

function get2FAEmail(name, otp) {
  return {
    subject: "MedIntel — Your Login Verification Code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#1e3a5f;font-size:28px;margin:0;">MedIntel</h1>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Intelligent Medical Support</p>
        </div>
        <div style="background:#ffffff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
          <h2 style="color:#1e3a5f;margin-top:0;">🔐 Two-Factor Authentication</h2>
          <p style="color:#475569;line-height:1.6;">Hello <strong>${name}</strong>,</p>
          <p style="color:#475569;line-height:1.6;">Someone is attempting to log in to your MedIntel account. Use the code below to verify it's you:</p>
          <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background:#1e3a5f;color:#ffffff;font-size:36px;font-weight:bold;letter-spacing:10px;padding:18px 32px;border-radius:10px;">${otp}</div>
          </div>
          <div style="background:#fefce8;border-left:4px solid #eab308;padding:14px 18px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;color:#854d0e;font-size:14px;">⏱ This code expires in <strong>5 minutes</strong>.</p>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin-top:28px;">If this wasn't you, secure your account immediately by changing your password.</p>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:20px;">© 202 MedIntel · SABYONI Devs · POPIA Compliant</p>
      </div>
    `,
  };
}

// ── Main handler ──
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, email, name } = req.body;

  if (!type || !email) {
    return res.status(400).json({ error: "Missing required fields: type, email" });
  }

  try {
    // ── 1. WELCOME EMAIL (patient signup) ──
    if (type === "welcome") {
      const template = getWelcomeEmail(name || email.split("@")[0], email);
      await transporter.sendMail({
        from: `"MedIntel" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      return res.status(200).json({ success: true, message: "Welcome email sent" });
    }

    // ── 2. FIRST LOGIN — staff password reset notification ──
    if (type === "first_login") {
      const { tempPassword } = req.body;
      const template = getFirstLoginEmail(name || email.split("@")[0], email, tempPassword || "Check with your administrator");
      await transporter.sendMail({
        from: `"MedIntel" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      return res.status(200).json({ success: true, message: "First login email sent" });
    }

    // ── 3. FORGOT PASSWORD — generate & store OTP ──
    if (type === "forgot_password") {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Delete any existing unused OTPs for this email
      await supabase
        .from("otp_codes")
        .delete()
        .eq("email", email)
        .eq("type", "password_reset");

      const { error: insertError } = await supabase
        .from("otp_codes")
        .insert([{ email, otp, type: "password_reset", expires_at: expiresAt }]);

      if (insertError) throw new Error(insertError.message);

      const template = getForgotPasswordEmail(name || email.split("@")[0], otp);
      await transporter.sendMail({
        from: `"MedIntel" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      return res.status(200).json({ success: true, message: "Password reset OTP sent" });
    }

    // ── 4. 2FA — generate & store OTP ──
    if (type === "2fa") {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      // Delete any existing unused 2FA OTPs for this email
      await supabase
        .from("otp_codes")
        .delete()
        .eq("email", email)
        .eq("type", "2fa");

      const { error: insertError } = await supabase
        .from("otp_codes")
        .insert([{ email, otp, type: "2fa", expires_at: expiresAt }]);

      if (insertError) throw new Error(insertError.message);

      const template = get2FAEmail(name || email.split("@")[0], otp);
      await transporter.sendMail({
        from: `"MedIntel" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });
      return res.status(200).json({ success: true, message: "2FA OTP sent" });
    }

    // ── 5. VERIFY OTP (for both 2fa and password_reset) ──
    if (type === "verify_otp") {
      const { otp, otp_type } = req.body;

      if (!otp || !otp_type) {
        return res.status(400).json({ error: "Missing otp or otp_type" });
      }

      const { data, error } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("otp", otp)
        .eq("type", otp_type)
        .eq("used", false)
        .single();

      if (error || !data) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      if (new Date(data.expires_at) < new Date()) {
        return res.status(400).json({ error: "Code has expired. Please request a new one." });
      }

      // Mark OTP as used
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", data.id);

      return res.status(200).json({ success: true, message: "OTP verified" });
    }

    return res.status(400).json({ error: "Unknown email type" });

  } catch (err) {
    console.error("Email handler error:", err.message);
    return res.status(500).json({ error: "Email sending failed", details: err.message });
  }
}