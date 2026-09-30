/* GamanMedi customer phone OTP + profile/auth integration. */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = window.GAMANMEDI_FIREBASE_CONFIG || {};
const configured = ["apiKey", "authDomain", "projectId", "appId", "messagingSenderId"]
  .every((key) => firebaseConfig[key] && !String(firebaseConfig[key]).startsWith("YOUR_"));

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

let auth = null;
let db = null;
let recaptchaVerifier = null;
let confirmationResult = null;
let currentUser = null;

function setStatus(message, success = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("success", success);
}

function firebaseErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/too-many-requests": "Too many attempts. Please wait and try again later.",
    "auth/invalid-phone-number": "That phone number is invalid.",
    "auth/quota-exceeded": "SMS quota has been reached. Please try again later.",
    "auth/operation-not-allowed": "Phone sign-in is not enabled in Firebase Authentication.",
    "auth/captcha-check-failed": "reCAPTCHA could not be verified. Refresh the page and try again.",
    "auth/invalid-verification-code": "Incorrect OTP. Please check the code and try again.",
    "auth/code-expired": "That OTP has expired. Request a new code.",
    "permission-denied": "Firebase denied access. Check your Firestore security rules."
  };
  return messages[code] || "Something went wrong. Please try again.";
}

function openModal() {
  authModal.classList.remove("hidden");
  setStatus("");
  if (!configured) setStatus("Firebase web config is not connected yet.");
}
function closeModal() { authModal.classList.add("hidden"); }

accountButton?.addEventListener("click", openModal);
closeAuth?.addEventListener("click", closeModal);
authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) closeModal();
});

function resetRecaptcha() {
  if (!auth || !configured) return;
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (_) {}
  }
  const container = document.getElementById("recaptcha-container");
  if (!container) return;
  container.innerHTML = "";
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
    callback: () => setStatus("Verification check complete.", true),
    "expired-callback": () => setStatus("reCAPTCHA expired. Please complete it again.")
  });
}

function normalizeIndianPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

function sanitizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getCustomerRef() {
  if (!currentUser || !db) throw new Error("Not signed in");
  return doc(db, "customers", currentUser.uid);
}

sendButton?.addEventListener("click", async () => {
  setStatus("");
  if (!configured || !auth) return setStatus("Connect the Firebase web config before sending OTP.");

  const name = sanitizeName(nameInput.value);
  const phone = normalizeIndianPhone(phoneInput.value);
  if (name.length < 2) return setStatus("Please enter your full name.");
  if (!phone) return setStatus("Enter a valid 10-digit Indian mobile number.");

  sendButton.disabled = true;
  sendButton.textContent = "Sending OTP…";
  try {
    if (!recaptchaVerifier) resetRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    otpMessage.textContent = `Enter the verification code sent to ${phone}.`;
    profileStep.classList.add("hidden");
    otpStep.classList.remove("hidden");
    otpInput.value = "";
    otpInput.focus();
    setStatus("OTP sent. Check your SMS messages.", true);
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
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
    const name = sanitizeName(nameInput.value);
    if (name && user.displayName !== name) await updateProfile(user, { displayName: name });

    const customerRef = doc(db, "customers", user.uid);
    const existingSnap = await getDoc(customerRef);
    const existing = existingSnap.exists() ? existingSnap.data() : {};
    const addresses = Array.isArray(existing.addresses) ? existing.addresses.slice(0, 10) : [];

    await setDoc(customerRef, {
      uid: user.uid,
      name: name || user.displayName || existing.name || "",
      phoneNumber: user.phoneNumber || existing.phoneNumber || "",
      email: existing.email || "",
      addresses,
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    confirmationResult = null;
    setStatus("Phone verified. You are signed in.", true);
    await showSignedIn(user);
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
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
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
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
  const ref = await getCustomerRef();
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { addresses: [] };
}

saveProfileButton?.addEventListener("click", async () => {
  if (!currentUser) return setStatus("Please sign in first.");
  const name = sanitizeName(profileNameInput.value);
  const email = profileEmailInput.value.trim().slice(0, 120);
  if (name.length < 2) return setStatus("Please enter a name with at least 2 characters.");
  if (!validEmail(email)) return setStatus("Enter a valid email address or leave it blank.");

  saveProfileButton.disabled = true;
  try {
    await updateProfile(currentUser, { displayName: name });
    await setDoc(await getCustomerRef(), {
      uid: currentUser.uid,
      name,
      phoneNumber: currentUser.phoneNumber || "",
      email,
      updatedAt: serverTimestamp()
    }, { merge: true });
    accountButton.textContent = `Hi, ${name.split(" ")[0]}`;
    summaryEl.textContent = `${currentUser.phoneNumber || "Verified phone"} · Phone verified`;
    setStatus("Profile saved successfully.", true);
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
  } finally {
    saveProfileButton.disabled = false;
  }
});

addAddressButton?.addEventListener("click", async () => {
  if (!currentUser) return setStatus("Please sign in first.");
  const label = (addressLabelInput.value.trim() || "Address").slice(0, 30);
  const text = addressTextInput.value.trim().slice(0, 400);
  if (text.length < 10) return setStatus("Please enter the complete address.");

  addAddressButton.disabled = true;
  try {
    const data = await readCustomerData();
    const addresses = Array.isArray(data.addresses) ? data.addresses.slice(0, 10) : [];
    if (addresses.length >= 10) return setStatus("You can save up to 10 addresses.");
    addresses.push({ label, text, createdAt: new Date().toISOString() });
    await setDoc(await getCustomerRef(), {
      uid: currentUser.uid,
      addresses,
      updatedAt: serverTimestamp()
    }, { merge: true });
    renderAddresses(addresses);
    addressLabelInput.value = "";
    addressTextInput.value = "";
    setStatus("Delivery address saved.", true);
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
  } finally {
    addAddressButton.disabled = false;
  }
});

async function removeAddress(index) {
  if (!currentUser) return;
  try {
    const data = await readCustomerData();
    const addresses = Array.isArray(data.addresses) ? data.addresses.slice(0, 10) : [];
    if (index < 0 || index >= addresses.length) return;
    addresses.splice(index, 1);
    await setDoc(await getCustomerRef(), {
      uid: currentUser.uid,
      addresses,
      updatedAt: serverTimestamp()
    }, { merge: true });
    renderAddresses(addresses);
    setStatus("Address removed.", true);
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
  }
}

signOutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    currentUser = null;
    confirmationResult = null;
    accountButton.textContent = "Sign in";
    signedInPanel.classList.add("hidden");
    profileStep.classList.remove("hidden");
    nameInput.value = "";
    phoneInput.value = "";
    otpInput.value = "";
    setStatus("You have signed out.", true);
    resetRecaptcha();
  } catch (error) {
    console.error(error);
    setStatus(firebaseErrorMessage(error));
  }
});

async function initializeFirebase() {
  if (!configured) return;
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    auth.languageCode = "en";
    await setPersistence(auth, browserLocalPersistence);
    onAuthStateChanged(auth, (user) => {
      if (user) showSignedIn(user);
      else {
        currentUser = null;
        accountButton.textContent = "Sign in";
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    setStatus("Firebase could not initialize. Check the web configuration.");
  }
}

initializeFirebase();
