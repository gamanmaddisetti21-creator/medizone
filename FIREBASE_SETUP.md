# GamanMedi Firebase Phone OTP Login

This is a vanilla HTML/CSS/JavaScript integration using Firebase Authentication phone sign-in and Cloud Firestore to save the customer's name, UID, and verified phone number.

## Setup before real OTP SMS can work

1. Open https://console.firebase.google.com/ and create a Firebase project.
2. Add a Web App to the project. Copy its Firebase web config.
3. Open `firebase-auth.js` and replace the `YOUR_...` values in `firebaseConfig`.
4. In Firebase Console > Authentication > Sign-in method, enable **Phone**.
5. In Authentication > Settings > Authorized domains, add your deployed domain. For local development, serve the site on `localhost` (not by opening the HTML as a file).
6. Create a Cloud Firestore database.
7. Configure Firestore rules before production. Example starting point (allow each signed-in customer to read/write only their own profile):

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{uid} {
      allow read, create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.uid == uid;
      allow delete: if false;
    }
  }
}
```

Review and test rules in Firebase Rules Playground before launch. Keep any privileged admin/service-account credentials on a trusted server only.

## Testing

Firebase Console > Authentication > Sign-in method > Phone supports test phone numbers and fixed test OTP codes. Use test numbers during development to avoid real SMS charges. Real SMS availability, quotas, billing, regional restrictions, and abuse protection depend on your Firebase project and current Firebase terms.

## Important production notes

- Use HTTPS for the deployed website.
- Configure reCAPTCHA and authorized domains.
- Add rate limiting/abuse monitoring and a clear privacy notice and consent language.
- Phone OTP verifies access to a number; it does not verify a customer's identity, age, prescription, or pharmacy eligibility.
- Do not store OTP codes yourself.
- Firestore currently stores basic profile fields only; no medical history or prescription information is stored by this module.
- Pharmacy inventory, orders, payment, delivery, and partner onboarding are not connected by this login module.


## Customer profile features included in this build

After phone verification, the customer can:
- View their verified phone number and customer name.
- Save/update their full name and optional email address.
- Add up to 10 delivery addresses with labels such as Home or Work.
- Remove saved addresses.
- Sign out and return later; Firebase Auth persistence and Firestore retain their account profile.

The profile document is stored at `customers/{Firebase Auth UID}`. Do not store prescriptions, diagnoses, or other medical information in this profile document. Before launch, review privacy notice, retention/deletion process, and applicable Indian data protection requirements.
