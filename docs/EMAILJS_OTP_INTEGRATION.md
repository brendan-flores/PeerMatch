# EmailJS OTP Integration Guide

Your PeerMatch authentication system now includes complete EmailJS OTP (One-Time Password) integration. This document outlines the implementation and provides configuration instructions.

## Overview

The authentication flow consists of:

1. **Registration** → User creates account with email/password
2. **OTP Generation** → 6-digit code generated and stored with 10-minute expiration (configurable)
3. **Email Delivery** → Verification email sent via EmailJS
4. **Verification** → User enters OTP to verify account
5. **Profile Setup** → User completes profile and gains platform access
6. **Resend** → Users can request a new OTP if expired or missed

## Current Configuration

### Environment Variables (Already Set)

```env
# EmailJS Credentials
EMAILJS_SERVICE_ID=service_fhyovvs
EMAILJS_TEMPLATE_ID=template_i7o4ljn
EMAILJS_PUBLIC_KEY=vxKkEeVy38_oEcHb9
EMAILJS_PRIVATE_KEY=tpc2c1rgksinyOeHPkX6Z

# OTP Settings
VERIFICATION_CODE_TTL_MINUTES=10
INSTITUTIONAL_EMAIL_DOMAIN=cit.edu
EMAIL_FROM_NAME=PeerMatch
```

## Backend Architecture

### 1. User Model ([server/models/User.js](server/models/User.js#L1-L50))

The User schema includes:
- `verified` (boolean) - Tracks if email is verified
- `verification` (object) - Stores OTP and expiration:
  - `code` (string) - 6-digit verification code
  - `expiresAt` (Date) - Expiration timestamp

### 2. Registration Endpoint (POST `/api/auth/register`)

**Located in:** [server/routes/auth.js](server/routes/auth.js#L110-L195)

**Process:**
- Validates username, email (must be institutional), and password
- Generates 6-digit OTP: `generateVerificationCode()`
- Calculates expiration: `getVerificationExpiration()`
- Stores both in database under `verification` field
- Calls `sendVerificationEmail()` via EmailJS
- Returns: email for query parameter on frontend

**Response:**
```json
{
  "message": "Verification code sent to email. Enter the code to verify your account.",
  "email": "user@cit.edu"
}
```

### 3. Verification Endpoint (POST `/api/auth/verify`)

**Located in:** [server/routes/auth.js](server/routes/auth.js#L197-L238)

**Process:**
- Takes email and OTP code from request body
- Finds unverified user matching email
- Validates code matches stored value
- Checks if code hasn't expired
- Sets `verified = true` and clears verification field
- Returns JWT token and logs user in

**Request:**
```json
{
  "email": "user@cit.edu",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully.",
  "user": {
    "id": "...",
    "username": "...",
    "email": "user@cit.edu",
    "verified": true,
    "role": "user",
    "accountType": "client|freelancer"
  }
}
```

### 4. Resend OTP Endpoint (POST `/api/auth/resend`)

**Located in:** [server/routes/auth.js](server/routes/auth.js#L438-L520)

**Process:**
- Takes email from request body
- Checks if user is already verified (returns 200 OK if so)
- Finds unverified user with that email
- Generates NEW 6-digit OTP and recalculates expiration
- Updates database with new code
- Calls `sendVerificationEmail()` again
- Includes 30-second cooldown on frontend to prevent spam

**Features:**
- Generates completely new OTP (old code becomes invalid)
- Resets expiration time to 10 minutes from request
- Handles both sync and async email sending based on env settings

## Frontend Architecture

### 1. Registration Flow ([app/register/[role]/page.tsx](app/register/[role]/page.tsx#L100-L112))

After successful registration:
```typescript
router.push(
  `/verify?email=${encodeURIComponent(trimmedEmail)}&role=${role}`
);
```

Redirects user to verification page with:
- `email` query parameter - recipient's email
- `role` query parameter - client or freelancer

### 2. Verification Page ([app/verify/page.tsx](app/verify/page.tsx#L1-L350))

**Features:**

#### OTP Input
- 6 separate input fields (one digit each)
- Auto-advance to next field after digit entry
- Backspace support to delete digits
- Arrow key navigation (left/right)
- Enter key submits when all 6 digits filled

#### Verification Submit
```typescript
await apiPostJson("/api/auth/verify", {
  email: emailFromQuery,
  code: digits.join(""),
});
```

On success: Redirects to profile setup page
- Clients → `/client-details`
- Freelancers → `/freelancer-details`

#### Resend OTP
```typescript
await apiPostJson("/api/auth/resend", { email: emailFromQuery });
```

Features:
- 30-second cooldown timer (prevents spam)
- Clears previous code inputs after resend
- Shows loading state ("Resending...")
- Success message confirms new code sent

#### Error Handling
- Invalid code feedback
- Expired code detection
- Network error messages
- Missing email graceful handling

## EmailJS Configuration

### Required Template Variables

Your EmailJS template **MUST include all these variables** in the editor:

```
{{to_email}}      - Recipient email address
{{email}}         - Alternate email parameter (same as to_email)
{{to_name}}       - User's display name
{{verification_code}} - 6-digit OTP
{{ttl_minutes}}   - Code expiration time (10)
{{from_name}}     - Sender name (PeerMatch)
```

### Template Example

Your template might look like:

```html
<h2>Welcome to {{from_name}}!</h2>

<p>Hi {{to_name}},</p>

<p>Please verify your email by entering the following code:</p>

<h1 style="font-size: 36px; letter-spacing: 4px;">{{verification_code}}</h1>

<p>This code will expire in {{ttl_minutes}} minutes.</p>

<p>If you didn't create this account, please ignore this email.</p>

<p>Best regards,<br>The {{from_name}} Team</p>
```

### Data Flow to EmailJS

When OTP email is sent, this payload goes to EmailJS:

```javascript
{
  service_id: "service_fhyovvs",
  template_id: "template_i7o4ljn",
  user_id: "vxKkEeVy38_oEcHb9",  // Public key
  accessToken: "tpc2c1rgksinyOeHPkX6Z",  // Private key (optional)
  template_params: {
    to_email: "user@cit.edu",
    email: "user@cit.edu",
    to_name: "User Name",
    verification_code: "123456",
    ttl_minutes: "10",
    from_name: "PeerMatch"
  }
}
```

## API Reference

### Register User
- **Endpoint:** `POST /api/auth/register`
- **Auth:** None (public)
- **Body:** `{ username, email, password, role }`
- **Response:** 201 Created with email in body
- **Errors:** 400 (validation), 409 (duplicate), 502 (email failed)

### Verify OTP
- **Endpoint:** `POST /api/auth/verify`
- **Auth:** None (public)
- **Body:** `{ email, code }`
- **Response:** 200 OK with JWT token
- **Errors:** 400 (invalid/expired), 404 (not found), 409 (already verified)

### Resend OTP
- **Endpoint:** `POST /api/auth/resend`
- **Auth:** None (public)
- **Body:** `{ email }`
- **Response:** 200 OK with confirmation
- **Errors:** 400 (invalid email), 404 (not found), 502 (email failed)

## Testing the Flow

### Step 1: Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@cit.edu",
    "password": "TestPass123!",
    "role": "freelancer"
  }'
```

Expected response includes the email - note it for next steps.

### Step 2: Verify
Check your email for the 6-digit code, then:
```bash
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@cit.edu",
    "code": "123456"
  }'
```

### Step 3: Resend (if code expires)
```bash
curl -X POST http://localhost:5000/api/auth/resend \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@cit.edu"
  }'
```

## Troubleshooting

### Email Not Received

1. **Check EmailJS credentials in .env**
   - Verify `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` are correct
   - Visit https://dashboard.emailjs.com to confirm

2. **Verify EmailJS template exists**
   - Log into EmailJS dashboard
   - Check template ID matches environment variable
   - Template must include all variables: `{{email}}`, `{{to_name}}`, `{{verification_code}}`, etc.

3. **Check server logs**
   - Look for `[EmailJS]` log entries
   - Redacted payload shows what was sent
   - Check for error messages about missing template variables

4. **Test email manually in EmailJS**
   - Go to EmailJS dashboard
   - Use "Test It" feature on your template
   - Ensure you can send manually before debugging backend

### Code Expires Before Entry

- `VERIFICATION_CODE_TTL_MINUTES` controls expiration (default 10 minutes)
- Increase in .env if needed: `VERIFICATION_CODE_TTL_MINUTES=15`
- Restart backend for changes to take effect

### Resend Button Disabled

- Frontend enforces 30-second cooldown after each resend
- Wait for timer to count down before clicking again
- Prevents email service rate-limiting

### Registration Fails with 502 Error

- Email delivery failed - check EmailJS configuration
- Check that template exists and all variables are included
- Verify service/template IDs match environment variables
- Check EmailJS usage quota hasn't been exceeded

## Security Notes

- OTP codes are random 6-digit numbers (1 million possible combinations)
- Each resend generates a brand new code (old code becomes invalid)
- Codes expire after configured TTL (default 10 minutes)
- Verification field is cleared from database after successful verification
- EmailJS private key stored in `.env` (never committed to git)
- Institutional email domain validation prevents random signups

## Files Modified

- ✅ [server/models/User.js](server/models/User.js) - Added verification schema
- ✅ [server/routes/auth.js](server/routes/auth.js) - Added register, verify, resend endpoints
- ✅ [server/utils/mailer.js](server/utils/mailer.js) - EmailJS integration
- ✅ [server/utils/emailjsEmail.js](server/utils/emailjsEmail.js) - EmailJS HTTPS implementation
- ✅ [app/register/[role]/page.tsx](app/register/[role]/page.tsx) - Redirects to verify
- ✅ [app/verify/page.tsx](app/verify/page.tsx) - OTP input and resend UI

## Environment Variables Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `EMAILJS_SERVICE_ID` | Yes | - | From EmailJS dashboard |
| `EMAILJS_TEMPLATE_ID` | Yes | - | From EmailJS dashboard |
| `EMAILJS_PUBLIC_KEY` | Yes | - | From EmailJS dashboard |
| `EMAILJS_PRIVATE_KEY` | Optional | - | For server-side API (recommended) |
| `VERIFICATION_CODE_TTL_MINUTES` | No | 10 | OTP expiration time |
| `INSTITUTIONAL_EMAIL_DOMAIN` | No | cit.edu | Required domain for registration |
| `EMAIL_FROM_NAME` | No | PeerMatch | Display name in emails |
| `EMAIL_SYNC_SEND` | No | false | Wait for email before responding |
| `EMAIL_PREFER_SMTP` | No | false | Prefer SMTP if available |

## Next Steps

1. ✅ Backend OTP generation and storage - **DONE**
2. ✅ EmailJS template configuration - **VERIFY YOUR TEMPLATE**
3. ✅ Frontend verification UI - **DONE**
4. ✅ Resend OTP feature - **DONE**
5. Test end-to-end flow with a test email
6. Monitor logs for any EmailJS delivery issues
7. Adjust `VERIFICATION_CODE_TTL_MINUTES` if needed

## Support

For EmailJS issues:
- Visit: https://support.emailjs.com
- Check: https://www.emailjs.com/docs/

For PeerMatch issues:
- Check server logs for `[EmailJS]` entries
- Verify all credentials in `.env`
- Test with curl commands in Troubleshooting section
