# GamanMedi Firebase production checklist

## Firebase Console
- Authentication > Sign-in method: Phone enabled.
- Authentication > Settings > Authorized domains: add the exact live domain(s), plus localhost only if needed for development.
- Authentication > Settings: make sure the SMS region policy permits India.
- Firestore Database: database created and the rules in `firestore.rules` reviewed/published.
- Authentication > Phone: use Firebase test phone numbers during development before real SMS.

## Website
1. Put the Firebase Web App config in `firebase-config.js`.
2. Do NOT put Firebase service-account JSON, private keys, or Admin SDK credentials in the website.
3. Deploy all of these files together: `index.html`, `style.css`, `script.js`, `firebase-config.js`, `firebase-auth.js`.
4. Use HTTPS in production.
5. Test: Sign in -> reCAPTCHA -> OTP -> profile -> save address -> refresh -> sign out -> sign in again.

## Firestore data model
customers/{Firebase Auth UID}
  uid: string
  name: string
  phoneNumber: string
  email: string
  addresses: [{label: string, text: string, createdAt: string}]
  createdAt: timestamp
  updatedAt: timestamp

## Important
Phone OTP proves control of a phone number. It does not by itself verify identity, age, prescription eligibility, or pharmacy partnership status.
Do not store OTP codes in Firestore. Do not put medical records or prescription files in this customer profile document.
