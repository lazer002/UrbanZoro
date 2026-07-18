import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.EMAIL_PASS);

export const sendOtpMail = async (to, otp) => {
  return resend.emails.send({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Your GARRIB Verification Code",
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>GARRIB OTP</title>
</head>

<body style="margin:0;padding:40px 0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #ECECEC;">

<!-- Top Accent -->
<tr>
<td style="height:6px;background:#B6FF2E;"></td>
</tr>

<!-- Header -->
<tr>
<td style="padding:48px 48px 20px;text-align:center;">

<div style="
width:64px;
height:64px;
margin:auto;
background:#111111;
border-radius:20px;
line-height:64px;
font-size:28px;
font-weight:700;
color:#B6FF2E;
">
G
</div>

<h1 style="
margin:24px 0 8px;
font-size:34px;
font-weight:800;
letter-spacing:4px;
color:#111111;
">
GARRIB
</h1>

<p style="
margin:0;
font-size:14px;
letter-spacing:2px;
text-transform:uppercase;
color:#777777;
">
Premium Streetwear
</p>

</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 48px;">
<div style="height:1px;background:#EEEEEE;"></div>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:40px 48px;">

<p style="
margin:0;
font-size:13px;
letter-spacing:2px;
text-transform:uppercase;
color:#999999;
font-weight:600;
">
Email Verification
</p>

<h2 style="
margin:14px 0 18px;
font-size:30px;
line-height:38px;
color:#111111;
font-weight:800;
">
Verify your account
</h2>

<p style="
margin:0 0 36px;
font-size:16px;
line-height:28px;
color:#666666;
">
Use the verification code below to continue signing in to your GARRIB account.
This code is valid for <strong>5 minutes</strong>.
</p>

<!-- OTP -->
<div style="
background:#111111;
border-radius:20px;
padding:28px;
text-align:center;
">

<div style="
font-size:42px;
font-weight:800;
letter-spacing:12px;
color:#B6FF2E;
">
${otp}
</div>

</div>

<!-- Info -->
<div style="
margin-top:36px;
padding:20px;
border-radius:16px;
background:#F8F8F8;
border:1px solid #ECECEC;
">

<p style="
margin:0;
font-size:14px;
line-height:24px;
color:#666666;
">
If you didn't request this code, you can safely ignore this email.
Never share your OTP with anyone.
</p>

</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:0 48px;">
<div style="height:1px;background:#EEEEEE;"></div>
</td>
</tr>

<tr>
<td style="padding:30px 48px 42px;">

<table width="100%">
<tr>

<td align="left">

<p style="
margin:0;
font-size:12px;
color:#999999;
letter-spacing:1px;
text-transform:uppercase;
">
© ${new Date().getFullYear()} GARRIB
</p>

<p style="
margin:8px 0 0;
font-size:13px;
color:#777777;
">
Premium Fashion Experience
</p>

</td>

<td align="right">

<a
href="mailto:${process.env.EMAIL_FROM || process.env.EMAIL_USER}"
style="
display:inline-block;
padding:12px 22px;
background:#B6FF2E;
color:#111111;
font-weight:700;
font-size:13px;
text-decoration:none;
border-radius:999px;
">
Support
</a>

</td>

</tr>
</table>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
    `,
  });
};