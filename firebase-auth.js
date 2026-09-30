/*
 * GamanMedi Firebase Phone OTP authentication.
 *
 * SETUP:
 * 1. Create a Firebase project at https://console.firebase.google.com/
 * 2. Add a Web App and copy its Firebase config below.
 * 3. Authentication > Sign-in method: enable Phone.
 * 4. Authentication > Settings: add your deployed domain to Authorized domains.
 * 5. For local testing use localhost. Do not deploy using the placeholder config.
 * 6. Serve this folder from a local web server or HTTPS (ES modules and reCAPTCHA
 *    do not work reliably when opening index.html directly as file://).
 *
 * Firebase web config is not a secret. Protect data with Firebase Security Rules;
 * never put service-account credentials or private server keys in this file.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, RecaptchaVerifier, signInWithPhoneNumber,
  onAuthStateChanged, signOut, setPersistence, browserLocalPersistence,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Replace every placeholder with the config from Firebase Console > Project settings > Your apps.
const firebaseConfig = {
  apiKey: "AIzaSyCaYQsf3yFn_UrQd_grApJMGKobQMunRN4",
  authDomain: "gamanmedi-cfc6f.firebaseapp.com",
  projectId: "gamanmedi-cfc6f",
  storageBucket: "gamanmedi-cfc6f.firebasestorage.app",
  messagingSenderId: "287113762309",
  appId: "1:287113762309:web:54a8432230b56fa605ae6c"
};

const configured = !Object.values(firebaseConfig).some(v => String(v).startsWith("YOUR_"));
const accountButton = document.getElementById("accountButton");
const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const nameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("customerPhone");
const otpInput = document.getElementById("customerOtp");
const sendButton = document.getElementById("sendOtpButton");
const verifyButton = document.getElementById("verifyOtpButton");
const backButton = document.getElementById("backToPhoneButton");
const signOutButton = document.getElementById("signOutButton");
const profileStep = document.getElementById("authProfileStep");
const otpStep = document.getElementById("authOtpStep");
const signedInPanel = document.getElementById("authSignedIn");
const statusEl = document.getElementById("authStatus");
const summaryEl = document.getElementById("signedInSummary");
const profileNameInput = document.getElementById("profileName");
const profileEmailInput = document.getElementById("profileEmail");
const saveProfileButton = document.getElementById("saveProfileButton");
const addressLabelInput = document.getElementById("addressLabel");
const addressTextInput = document.getElementById("addressText");
const addAddressButton = document.getElementById("addAddressButton");
const savedAddressesEl = document.getElementById("savedAddresses");
const otpMessage = document.getElementById("otpSentMessage");

let auth, db, recaptchaVerifier, confirmationResult, currentUser;
const setStatus = (message, success=false) => {
  statusEl.textContent = message;
  statusEl.classList.toggle("success", success);
};
const openModal = () => {
  authModal.classList.remove("hidden");
  setStatus("");
  if (!configured) setStatus("Firebase is not configured yet. Follow the setup steps in firebase-auth.js.");
};
const closeModal = () => authModal.classList.add("hidden");
accountButton?.addEventListener("click", openModal);
closeAuth?.addEventListener("click", closeModal);
authModal?.addEventListener("click", e => { if (e.target === authModal) closeModal(); });

function resetRecaptcha() {
  if (!auth || !configured) return;
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch {}
  }
  document.getElementById("recaptcha-container").innerHTML = "";
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
    callback: () => setStatus("Verification check complete.", true),
    "expired-callback": () => setStatus("reCAPTCHA expired. Please complete it again.")
  });
}

function normalizeIndianPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return "+91" + digits;
}

sendButton?.addEventListener("click", async () => {
  setStatus("");
  if (!configured) {
    setStatus("Add your Firebase web config in firebase-auth.js first.");
    return;
  }
  const name = nameInput.value.trim();
  const phone = normalizeIndianPhone(phoneInput.value);
  if (name.length < 2) return setStatus("Please enter your name (at least 2 characters).");
  if (!phone) return setStatus("Enter a valid 10-digit Indian mobile number.");
  sendButton.disabled = true;
  sendButton.textContent = "Sending OTP…";
  try {
    if (!recaptchaVerifier) resetRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    otpMessage.textContent = `Enter the verification code sent to ${phone}.`;
    profileStep.classList.add("hidden");
    otpStep.classList.remove("hidden");
    otpInput.focus();
    setStatus("OTP sent. Check your SMS messages.", true);
  } catch (err) {
    console.error(err);
    setStatus(err.code === "auth/too-many-requests"
      ? "Too many attempts. Please wait before trying again."
      : err.code === "auth/invalid-phone-number"
      ? "That phone number is invalid."
      : "Could not send OTP. Check Firebase phone-auth settings, authorized domain, billing/quotas and reCAPTCHA, then try again.");
    resetRecaptcha();
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send OTP";
  }
});

verifyButton?.addEventListener("click", async () => {
  setStatus("");
  const code = otpInput.value.trim();
  if (!confirmationResult) return setStatus("Request an OTP first.");
  if (!/^\d{6}$/.test(code)) return setStatus("Enter the 6-digit OTP.");
  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying…";
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    const name = nameInput.value.trim();
    if (name && user.displayName !== name) await updateProfile(user, { displayName: name });
    // Store only basic account profile data. Never store OTPs.
    const customerRef = doc(db, "customers", user.uid);
    const existing = await getDoc(customerRef);
    await setDoc(customerRef, {
      uid: user.uid,
      name: name || user.displayName || "",
      phoneNumber: user.phoneNumber || "",
      email: existing.exists() ? (existing.data().email || "") : "",
      addresses: existing.exists() && Array.isArray(existing.data().addresses) ? existing.data().addresses : [],
      createdAt: existing.exists() ? (existing.data().createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStatus("Phone verified. You are signed in.", true);
    await showSignedIn(user);
  } catch (err) {
    console.error(err);
    setStatus(err.code === "auth/invalid-verification-code"
      ? "Incorrect OTP. Please check the code and try again."
      : "Verification failed. The code may have expired; request a new one.");
  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify and sign in";
  }
});

backButton?.addEventListener("click", () => {
  confirmationResult = null;
  otpStep.classList.add("hidden");
  profileStep.classList.remove("hidden");
  otpInput.value = "";
  setStatus("");
  resetRecaptcha();
});

async function showSignedIn(user) {
  currentUser = user;
  accountButton.textContent = user.displayName ? `Hi, ${user.displayName.split(" ")[0]}` : "My account";
  profileStep.classList.add("hidden");
  otpStep.classList.add("hidden");
  signedInPanel.classList.remove("hidden");
  summaryEl.textContent = `${user.phoneNumber || "Verified phone"} · Phone verified`;
  try {
    const snap = await getDoc(doc(db, "customers", user.uid));
    const data = snap.exists() ? snap.data() : {};
    profileNameInput.value = data.name || user.displayName || "";
    profileEmailInput.value = data.email || "";
    renderAddresses(Array.isArray(data.addresses) ? data.addresses : []);
  } catch (err) {
    console.error(err);
    setStatus("Signed in, but profile could not load. Check Firestore rules and database setup.");
  }
}

function renderAddresses(addresses) {
  savedAddressesEl.innerHTML = "";
  if (!addresses.length) {
    const empty = document.createElement("p");
    empty.className = "modal-note";
    empty.textContent = "No saved addresses yet.";
    savedAddressesEl.appendChild(empty);
    return;
  }
  addresses.forEach((address, index) => {
    const card = document.createElement("div");
    card.className = "saved-address-card";
    const title = document.createElement("strong");
    title.textContent = address.label || `Address ${index + 1}`;
    const body = document.createElement("div");
    body.textContent = address.text || "";
    const actions = document.createElement("div");
    actions.className = "address-actions";
    const remove = document.createElement("button");
    remove.className = "address-delete";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeAddress(index));
    actions.append(remove);
    card.append(title, body, actions);
    savedAddressesEl.appendChild(card);
  });
}

async function readCustomerData() {
  if (!currentUser) throw new Error("Please sign in first.");
  const snap = await getDoc(doc(db, "customers", currentUser.uid));
  return snap.exists() ? snap.data() : { addresses: [] };
}

saveProfileButton?.addEventListener("click", async () => {
  if (!currentUser) return setStatus("Please sign in first.");
  const name = profileNameInput.value.trim();
  const email = profileEmailInput.value.trim();
  if (name.length < 2) return setStatus("Please enter a name with at least 2 characters.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus("Enter a valid email address or leave it blank.");
  saveProfileButton.disabled = true;
  try {
    await updateProfile(currentUser, { displayName: name });
    await setDoc(doc(db, "customers", currentUser.uid), {
      uid: currentUser.uid, name, email,
      phoneNumber: currentUser.phoneNumber || "",
      updatedAt: serverTimestamp()
    }, { merge: true });
    accountButton.textContent = `Hi, ${name.split(" ")[0]}`;
    setStatus("Profile saved successfully.", true);
  } catch (err) {
    console.error(err);
    setStatus("Could not save profile. Check Firestore rules and try again.");
  } finally { saveProfileButton.disabled = false; }
});

addAddressButton?.addEventListener("click", async () => {
  if (!currentUser) return setStatus("Please sign in first.");
  const label = addressLabelInput.value.trim() || "Address";
  const text = addressTextInput.value.trim();
  if (text.length < 10) return setStatus("Please enter the complete address.");
  if (text.length > 400) return setStatus("Address is too long.");
  addAddressButton.disabled = true;
  try {
    const data = await readCustomerData();
    const addresses = Array.isArray(data.addresses) ? data.addresses : [];
    if (addresses.length >= 10) {
      setStatus("You can save up to 10 addresses.");
      return;
    }
    addresses.push({ label, text, createdAt: new Date().toISOString() });
    await setDoc(doc(db, "customers", currentUser.uid), {
      uid: currentUser.uid, addresses, updatedAt: serverTimestamp()
    }, { merge: true });
    renderAddresses(addresses);
    addressLabelInput.value = "";
    addressTextInput.value = "";
    setStatus("Delivery address saved.", true);
  } catch (err) {
    console.error(err);
    setStatus("Could not save address. Check Firestore rules and try again.");
  } finally { addAddressButton.disabled = false; }
});

async function removeAddress(index) {
  if (!currentUser) return;
  try {
    const data = await readCustomerData();
    const addresses = Array.isArray(data.addresses) ? data.addresses : [];
    addresses.splice(index, 1);
    await setDoc(doc(db, "customers", currentUser.uid), {
      uid: currentUser.uid, addresses, updatedAt: serverTimestamp()
    }, { merge: true });
    renderAddresses(addresses);
    setStatus("Address removed.", true);
  } catch (err) {
    console.error(err);
    setStatus("Could not remove address.");
  }
}

signOutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    currentUser = null;
    accountButton.textContent = "Sign in";
    signedInPanel.classList.add("hidden");
    profileStep.classList.remove("hidden");
    nameInput.value = "";
    phoneInput.value = "";
    otpInput.value = "";
    confirmationResult = null;
    setStatus("You have signed out.", true);
  } catch (err) {
    setStatus("Could not sign out. Please try again.");
  }
});

if (configured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    await setPersistence(auth, browserLocalPersistence);
    onAuthStateChanged(auth, user => {
      if (user) showSignedIn(user);
      else {
        currentUser = null;
        accountButton.textContent = "Sign in";
      }
    });
  } catch (err) {
    console.error("Firebase initialization error:", err);
    setStatus("Firebase could not initialize. Check the configuration.");
  }
}
