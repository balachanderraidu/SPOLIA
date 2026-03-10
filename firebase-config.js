// ──────────────────────────────────────────────────────────────────
// firebase-config.js  —  Spolia Firebase integration (LIVE)
// ──────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import {
    getAuth, GoogleAuthProvider, PhoneAuthProvider,
    signInWithPopup, signInWithRedirect, getRedirectResult,
    signInWithPhoneNumber, linkWithCredential,
    RecaptchaVerifier,
    signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    getFirestore, collection, query, where, orderBy,
    onSnapshot, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNAKDQYiWbo5G0tuDvfiU7i_4mHVTc8Nw",
    authDomain: "spolia-c42ab.firebaseapp.com",
    projectId: "spolia-c42ab",
    storageBucket: "spolia-c42ab.firebasestorage.app",
    messagingSenderId: "515923522416",
    appId: "1:515923522416:web:03987fa07c50e26446d5b5",
    measurementId: "G-Y19KLCW04H"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// ──────────────────────────────────────────────────────────────────
// Firebase Authentication — REAL SDK CALLS
// ──────────────────────────────────────────────────────────────────

// Module-level state — only ONE RecaptchaVerifier is allowed at a time.
// Keeping these outside the object prevents the "reCAPTCHA has already been rendered"
// error that plagued the previous implementation.
let _recaptchaVerifier = null;
let _confirmationResult = null;

const FirebaseAuth = {

    // ── Google Sign-In (popup ONLY — no redirect fallback) ───────
    // NOTE: signInWithRedirect does NOT work on Netlify because Netlify
    // doesn't serve Firebase's /__/auth/handler route. Popup is the only
    // reliable method for non-Firebase-Hosting deployments.
    signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            return await signInWithPopup(auth, provider);
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request') {
                // User dismissed the popup — not a real error
                throw { code: 'auth/popup-dismissed', message: 'Sign-in cancelled.' };
            }
            if (err.code === 'auth/popup-blocked') {
                // Browser blocked the popup — give a clear actionable message
                throw {
                    code: 'auth/popup-blocked',
                    message: 'Google sign-in popup was blocked. Please allow popups for spolia.peroneira.com in your browser settings, then try again.'
                };
            }
            throw err;
        }
    },

    // ── Consume a pending Google redirect result ──────────────────
    // MUST be called once on every page load before the auth state listener.
    // If signInWithRedirect was triggered on the previous page, this resolves it.
    handleRedirectResult: async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result?.user) {
                console.log('[FirebaseAuth] Redirect result resolved:', result.user.uid);
            }
            return result;
        } catch (err) {
            // auth/credential-already-in-use is normal — user already signed in.
            if (err.code !== 'auth/credential-already-in-use') {
                console.warn('[FirebaseAuth] handleRedirectResult error:', err.code, err.message);
            }
            return null;
        }
    },

    // ── Phone OTP: Send ───────────────────────────────────────────
    // Creates (or re-creates) an invisible RecaptchaVerifier, then sends OTP.
    // phone must be E.164 format, e.g. "+919876543210"
    sendOTP: async (phone) => {
        // Destroy any existing verifier before creating a new one.
        // This is the fix for "reCAPTCHA has already been rendered in this element".
        try {
            if (_recaptchaVerifier) {
                _recaptchaVerifier.clear();
                _recaptchaVerifier = null;
            }
        } catch (_) { /* ignore cleanup errors */ }

        _recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => { /* reCAPTCHA solved — sendOTP will auto-continue */ }
        });

        try {
            _confirmationResult = await signInWithPhoneNumber(auth, phone, _recaptchaVerifier);
            console.log('[FirebaseAuth] OTP sent to', phone);
        } catch (err) {
            // Clean up verifier on failure so next attempt starts fresh
            try { _recaptchaVerifier.clear(); } catch (_) {}
            _recaptchaVerifier = null;
            _confirmationResult = null;
            throw err;
        }
    },

    // ── Phone OTP: Confirm (sign-in with phone only) ──────────────
    confirmOTP: async (code) => {
        if (!_confirmationResult) throw new Error('No pending OTP. Please request a new code.');
        const result = await _confirmationResult.confirm(code);
        _confirmationResult = null;
        return result;
    },

    // ── Phone OTP: Link (add phone to an existing Google account) ─
    // Called when a user is already signed in with Google and wants to
    // also verify their phone number. Results in a single unified account.
    linkPhone: async (code) => {
        if (!_confirmationResult) throw new Error('No pending OTP. Please request a new code.');
        const credential = PhoneAuthProvider.credentialFromResult(_confirmationResult);
        // If confirmResult is not a PhoneAuthProvider result, construct credential manually
        const phoneCredential = credential || PhoneAuthProvider.credential(
            _confirmationResult.verificationId, code
        );
        // Actually, we call confirm() which gives us the user directly:
        // For linking we need to use linkWithCredential
        const verificationId = _confirmationResult.verificationId;
        const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, code);
        _confirmationResult = null;
        return await linkWithCredential(auth.currentUser, phoneAuthCredential);
    },

    // ── Cleanup reCAPTCHA (call from onActivate when returning to login) ─
    resetRecaptcha: () => {
        try {
            if (_recaptchaVerifier) {
                _recaptchaVerifier.clear();
                _recaptchaVerifier = null;
            }
            _confirmationResult = null;
        } catch (_) { /* ignore */ }
    },

    signOut: async () => firebaseSignOut(auth),

    getCurrentUser: () => auth.currentUser,

    onAuthStateChanged: (callback) => firebaseOnAuthStateChanged(auth, callback)
};

// ──────────────────────────────────────────────────────────────────
// Cloud Firestore — REAL SDK CALLS
// Collections:
//   - /users/{uid}           — User profiles, verification status
//   - /listings/{listingId}  — Material listings (Radar feed)
//   - /bonds/{bondId}        — Spolia Bond transactions
//   - /disputes/{disputeId}  — Quality issue reports
//   - /platformStats/global  — Aggregated platform impact metrics
// ──────────────────────────────────────────────────────────────────
const FirebaseDB = {
    /**
     * Real-time listener for the Radar feed.
     */
    listenToRadar: (filter, onUpdate) => {
        let q;
        const listingsRef = collection(db, "listings");

        if (filter && filter !== "all") {
            q = query(listingsRef, where("type", "==", filter), orderBy("createdAt", "desc"));
        } else {
            q = query(listingsRef, orderBy("createdAt", "desc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const listings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            onUpdate(listings.length > 0 ? listings : MOCK_LISTINGS);
        }, (err) => {
            console.warn("[FirebaseDB] listenToRadar error, falling back to mock:", err);
            onUpdate(MOCK_LISTINGS);
        });

        return unsubscribe;
    },

    /**
     * Fetch a single listing by ID.
     */
    getListing: async (listingId) => {
        try {
            const snap = await getDoc(doc(db, "listings", listingId));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch (err) {
            console.warn("[FirebaseDB] getListing error:", err);
        }
        return MOCK_LISTINGS.find(l => l.id === listingId) || null;
    },

    /**
     * Create a new material listing.
     */
    createListing: async (listingData) => {
        const user = auth.currentUser;
        const docRef = await addDoc(collection(db, "listings"), {
            ...listingData,
            uid: user?.uid || null,
            seller: {
                uid: user?.uid || null,
                name: user?.displayName || "Anonymous",
                email: user?.email || null
            },
            verified: false,
            createdAt: serverTimestamp(),
            distance: 0
        });

        // Bump platform stats
        try {
            await setDoc(doc(db, "platformStats", "global"), {
                totalListings: increment(1)
            }, { merge: true });
        } catch (_) { /* non-critical */ }

        return docRef.id;
    },

    /**
     * Get user profile from Firestore (one-time fetch).
     */
    getUserProfile: async (uid) => {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch (err) {
            console.warn("[FirebaseDB] getUserProfile error:", err);
        }
        return null; // null means no profile exists yet
    },

    /**
     * Real-time listener for a user's own profile doc.
     * @returns {Function} unsubscribe
     */
    listenToUserProfile: (uid, onUpdate) => {
        return onSnapshot(doc(db, "users", uid), (snap) => {
            if (snap.exists()) {
                onUpdate({ id: snap.id, ...snap.data() });
            } else {
                onUpdate(null);
            }
        }, (err) => {
            console.warn("[FirebaseDB] listenToUserProfile error:", err);
            onUpdate(null);
        });
    },

    /**
     * Create or update user profile in Firestore.
     * FIX: uses setDoc(doc(db,"users",uid)) to write to the correct document path.
     */
    upsertUserProfile: async (uid, profileData) => {
        try {
            const userRef = doc(db, "users", uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                // Brand-new user — create the doc at users/{uid}
                await setDoc(userRef, {
                    uid,
                    ...profileData,
                    role: null,
                    verified: false,
                    onboardingComplete: false,
                    createdAt: serverTimestamp(),
                    impact: { co2Saved: 0, weightRescued: 0, transactions: 0 },
                    wallet: { balance: 0, currency: "₹", pendingBonds: 0 }
                });
            } else {
                // Existing user — merge provided fields; strip fields only admin should set.
                const { uid: _uid, role, verified, onboardingComplete, createdAt,
                        impact, wallet, ...safeUpdates } = profileData;
                // Remove undefined values — Firestore rejects them
                const cleanUpdates = Object.fromEntries(
                    Object.entries(safeUpdates).filter(([, v]) => v !== undefined)
                );
                await updateDoc(userRef, {
                    ...cleanUpdates,
                    lastSeenAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.warn("[FirebaseDB] upsertUserProfile error:", err);
        }
    },

    /**
     * Submit the onboarding/verification application.
     * Writes the verification data to users/{uid} and records in verificationRequests collection.
     */
    submitVerificationApplication: async (uid, { role, credentialNumber, docUrl }) => {
        try {
            // Update user doc — mark onboardingComplete: true so the user
            // is routed to Radar on next load instead of back to onboarding.
            // verificationStatus stays 'pending' until admin approves the credential.
            await updateDoc(doc(db, "users", uid), {
                role,
                credentialNumber,
                verificationDocUrl: docUrl || null,
                onboardingComplete: true,      // ← CRITICAL: gates radar access
                verificationSubmittedAt: serverTimestamp(),
                verificationStatus: "pending",
                verified: false                // admin sets this to true after review
            });

            // Also record in a verification queue collection for admin review
            await addDoc(collection(db, "verificationRequests"), {
                uid,
                role,
                credentialNumber,
                docUrl: docUrl || null,
                status: "pending",
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.warn("[FirebaseDB] submitVerificationApplication error:", err);
            throw err;
        }
    },

    /**
     * Fetch user's own listings.
     */
    getMyListings: async (uid) => {
        try {
            const q = query(
                collection(db, "listings"),
                where("uid", "==", uid),
                orderBy("createdAt", "desc")
            );
            // Use getDocs for a reliable one-shot fetch (avoids onSnapshot + setTimeout race)
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            console.warn("[FirebaseDB] getMyListings error:", err);
            return [];
        }
    },

    /**
     * Create a Spolia Bond transaction.
     * Returns the new bond document ID.
     */
    createBond: async (bondData) => {
        const user = auth.currentUser;
        const docRef = await addDoc(collection(db, "bonds"), {
            ...bondData,
            buyerUid: user?.uid || null,
            status: "pending",
            createdAt: serverTimestamp()
        });

        // Update platform stats
        try {
            await setDoc(doc(db, "platformStats", "global"), {
                totalBonds: increment(1),
                totalCo2Saved: increment(bondData.co2Saved || 0),
                totalWeightKg: increment(bondData.weightKg || 0),
                totalTransactions: increment(1)
            }, { merge: true });
        } catch (_) { /* non-critical */ }

        return docRef.id;
    },

    /**
     * Update a bond's status (e.g. to "confirmed", "disputed", "released").
     */
    updateBondStatus: async (bondId, status) => {
        try {
            await updateDoc(doc(db, "bonds", bondId), { status, updatedAt: serverTimestamp() });
        } catch (err) {
            console.warn("[FirebaseDB] updateBondStatus error:", err);
        }
    },

    /**
     * Submit a quality dispute report.
     */
    submitDispute: async (disputeData) => {
        const user = auth.currentUser;
        await addDoc(collection(db, "disputes"), {
            ...disputeData,
            reporterUid: user?.uid || null,
            status: "open",
            createdAt: serverTimestamp()
        });
    },

    /**
     * Submit a wallet withdrawal request
     */
    submitWithdrawal: async (withdrawalData) => {
        const user = auth.currentUser;
        if (!user) throw new Error("Must be logged in");
        
        await addDoc(collection(db, "withdrawals"), {
            ...withdrawalData,
            uid: user.uid,
            status: "pending",
            createdAt: serverTimestamp()
        });
    },

    /**
     * Fetch user's own bonds.
     */
    getMyBonds: async (uid) => {
        try {
            const q = query(
                collection(db, "bonds"),
                where("buyerUid", "==", uid),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            console.warn("[FirebaseDB] getMyBonds error:", err);
            return [];
        }
    },

    /**
     * Fetch platform aggregate stats for the Impact Dashboard.
     * Falls back to mock values if the Firestore doc doesn't exist yet.
     */
    getPlatformStats: async () => {
        try {
            const snap = await getDoc(doc(db, "platformStats", "global"));
            if (snap.exists()) return snap.data();
        } catch (err) {
            console.warn("[FirebaseDB] getPlatformStats error:", err);
        }
        // Fallback mock
        return {
            totalCo2Saved: 14500, // kg → 14.5T
            totalTransactions: 847,
            totalWeightKg: 124000,
            totalValueRescued: 28000000, // ₹2.8Cr
        };
    },

    /**
     * Real-time listener for platform stats.
     */
    listenToPlatformStats: (onUpdate) => {
        return onSnapshot(doc(db, "platformStats", "global"), (snap) => {
            if (snap.exists()) {
                onUpdate(snap.data());
            } else {
                onUpdate({
                    totalCo2Saved: 14500,
                    totalTransactions: 847,
                    totalWeightKg: 124000,
                    totalValueRescued: 28000000,
                });
            }
        }, (err) => {
            console.warn("[FirebaseDB] listenToPlatformStats error:", err);
        });
    },

    /**
     * Seed the platformStats/global document if it doesn't exist.
     * Safe to call on every app start — uses merge so it won't overwrite
     * any real accumulated data.
     */
    initPlatformStats: async () => {
        try {
            const ref = doc(db, "platformStats", "global");
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, {
                    totalCo2Saved: 14500,      // kg → 14.5T (seed / historical baseline)
                    totalTransactions: 847,
                    totalWeightKg: 124000,
                    totalValueRescued: 28000000,
                    totalListings: 10,
                    totalBonds: 42,
                    seededAt: serverTimestamp()
                });
                console.log("[FirebaseDB] platformStats/global seeded ✓");
            }
        } catch (err) {
            // Non-critical — app works fine without this doc (falls back to mock values)
            console.warn("[FirebaseDB] initPlatformStats:", err.message);
        }
    }
};

// ──────────────────────────────────────────────────────────────────
// Firebase Storage — REAL SDK CALLS
// ──────────────────────────────────────────────────────────────────
const FirebaseStorage = {
    uploadImage: async (file, path) => {
        try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        } catch (err) {
            console.warn("[FirebaseStorage] uploadImage error:", err);
            return "https://via.placeholder.com/400x300/1E1E1E/5C5647?text=Material+Image";
        }
    },

    uploadCOADocument: async (file, uid) => {
        try {
            const path = `verification/${uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        } catch (err) {
            console.warn("[FirebaseStorage] uploadCOADocument error:", err);
            return null;
        }
    }
};

// ──────────────────────────────────────────────────────────────────
// Mock Data — used as Radar fallback when Firestore is empty
// ──────────────────────────────────────────────────────────────────
const MOCK_LISTINGS = [
    {
        id: "listing-001", title: "Reclaimed Italian Travertine",
        type: "stone", quantity: 240, unit: "sqft", price: 180, currency: "₹",
        distance: 1.2, co2Saved: 480, bondProtected: true, verified: true,
        seller: { uid: "uid-002", name: "Studio Mehta", badge: "architect" },
        location: { lat: 19.076, lng: 72.877, label: "Bandra West, Mumbai" },
        description: "Premium book-matched travertine slabs from a completed villa project. Minimal wear, full thickness.",
        specs: { thickness: "20mm", finish: "Honed", color: "Warm Beige", grade: "Premium" }
    },
    {
        id: "listing-002", title: "Structural Steel I-Beams",
        type: "steel", quantity: 8, unit: "pieces", price: 12500, currency: "₹",
        distance: 3.4, co2Saved: 2100, bondProtected: true, verified: true,
        seller: { uid: "uid-003", name: "Apex Constructions", badge: "contractor" },
        location: { lat: 19.120, lng: 72.850, label: "Andheri East, Mumbai" },
        description: "ISMB 250 I-beams, 6m lengths. Minimal rust, structurally sound, de-roofed from a commercial project.",
        specs: { grade: "IS 2062 E250", length: "6m", section: "ISMB 250", condition: "Used - Good" }
    },
    {
        id: "listing-003", title: "Burma Teak Wood Rafters",
        type: "wood", quantity: 50, unit: "pieces", price: 4200, currency: "₹",
        distance: 0.8, co2Saved: 320, bondProtected: false, verified: true, archApproved: true,
        seller: { uid: "uid-004", name: "Rajan & Associates", badge: "verified" },
        location: { lat: 19.065, lng: 72.832, label: "Mahim, Mumbai" },
        description: "Burma teak rafters from century-old bungalow demolition. Dense grain, aged naturally.",
        specs: { species: "Burma Teak", dimensions: "100×50mm", length: "3.6m", age: "~80 years" }
    },
    {
        id: "listing-004", title: "Block C Basement Clearance",
        type: "bulk", quantity: 1, unit: "lot", price: 45000, currency: "₹",
        distance: 0.5, co2Saved: 850, bondProtected: false, verified: true,
        community: "MyHome Avatar",
        seller: { uid: "uid-005", name: "MyHome RWA", badge: "verified" },
        location: { lat: 19.045, lng: 72.900, label: "Chembur, Mumbai" },
        description: "Full basement clearance from Block C renovation. Mixed materials in excellent condition.",
        specs: { contents: "50× Cement Bags, 200 sqft Vitrified Tiles, 10× Ext. Paint Buckets" },
        contents: [
            { n: "Cement Bags", q: "50 Nos" },
            { n: "Vitrified Tiles", q: "200 sqft" },
            { n: "Ext. Paint", q: "10 Buckets" }
        ]
    },
    {
        id: "listing-005", title: "Italian Carrara Marble Slabs",
        type: "marble", quantity: 120, unit: "sqft", price: 420, currency: "₹",
        distance: 2.3, co2Saved: 960, bondProtected: true, verified: true, archApproved: true,
        seller: { uid: "uid-006", name: "Marble World India", badge: "vendor" },
        location: { lat: 19.088, lng: 72.862, label: "Khar West, Mumbai" },
        description: "Authentic Italian Carrara white marble. Surplus from luxury apartment project. Pristine condition.",
        specs: { origin: "Carrara, Italy", thickness: "18mm", finish: "Polished", color: "White with grey veining" }
    },
    {
        id: "listing-006", title: "Marino BWP 18mm Plywood",
        type: "wood", quantity: 2, unit: "pieces", price: 3200, currency: "₹",
        distance: 2.1, co2Saved: 45, bondProtected: false, verified: true, archApproved: true,
        seller: { uid: "uid-007", name: "SSC Constructions", badge: "contractor" },
        location: { lat: 19.058, lng: 72.841, label: "Matunga, Mumbai" },
        description: "BWP grade plywood sheets from a shuttering project. Full 8×4ft sheets, barely used.",
        specs: { grade: "BWP (Boiling Waterproof)", size: "8×4 ft", thickness: "18mm", brand: "Marino" }
    },
    {
        id: "listing-007", title: "Tata Tiscon 18mm Rebar",
        type: "steel", quantity: 5, unit: "pieces", price: 4500, currency: "₹",
        distance: 5.0, co2Saved: 120, bondProtected: true, verified: false,
        seller: { uid: "uid-008", name: "SSC Const.", badge: "contractor" },
        location: { lat: 19.100, lng: 72.895, label: "Ghatkopar, Mumbai" },
        description: "Tata Tiscon 12m bars. Cut-offs from column reinforcement. Spot rust only — structurally sound.",
        specs: { brand: "Tata Tiscon", length: "12m", diameter: "18mm", condition: "Used - Good" }
    },
    {
        id: "listing-008", title: "Ashirvad CPVC Pipes",
        type: "plumbing", quantity: 10, unit: "pieces", price: 850, currency: "₹",
        distance: 0.8, co2Saved: 12, bondProtected: false, verified: false, archApproved: true,
        community: "MyHome Avatar",
        seller: { uid: "uid-009", name: "MyHome RWA", badge: "verified" },
        location: { lat: 19.046, lng: 72.901, label: "Chembur, Mumbai" },
        description: "Surplus Ashirvad CPVC hot & cold water pipes from a toilet renovation. Never used.",
        specs: { brand: "Ashirvad", type: "CPVC", size: "25mm", length: "3m per piece" }
    },
    {
        id: "listing-009", title: "Birla A1 Cement (Nr Expiry)",
        type: "cement", quantity: 5, unit: "pieces", price: 1100, currency: "₹",
        distance: 1.5, co2Saved: 25, bondProtected: false, verified: true,
        seller: { uid: "uid-010", name: "Balaji Hardware", badge: "vendor" },
        location: { lat: 19.072, lng: 72.845, label: "Dadar, Mumbai" },
        description: "Birla A1 PPC cement bags, 2 months to expiry. Perfect for immediate use. 30% below MRP.",
        specs: { brand: "Birla A1", grade: "PPC", weight: "50kg/bag", expiry: "2 months" }
    },
    {
        id: "listing-010", title: "Red Clay Bricks",
        type: "brick", quantity: 5000, unit: "pieces", price: 12, currency: "₹",
        distance: 5.1, co2Saved: 1800, bondProtected: true, verified: false,
        seller: { uid: "uid-005", name: "BuildRight Materials", badge: "vendor" },
        location: { lat: 19.045, lng: 72.900, label: "Chembur, Mumbai" },
        description: "Handmade red clay bricks from a residential demolition site. Traditional size, good structural integrity.",
        specs: { size: "230×110×75mm", type: "Handmade Clay", compressiveStrength: "7.5 MPa", condition: "Used - Cleaned" }
    }
];

const MOCK_VENDORS = [
    {
        id: "v-001", title: "Asian Paints Ace Exterior (20L)",
        vendor: "Ravi Hardware", dist: "3.5km",
        price: 2800, oldPrice: 4500, off: "35%", currency: "₹",
        tag: "expiry", desc: "Near Expiry (2 Months)", icon: "🎨", type: "chem", co2Saved: 18
    },
    {
        id: "v-002", title: "Kajaria 2×2 Vitrified Tiles (Leftover)",
        vendor: "Balaji Tiles & Sanitary", dist: "5.2km",
        price: 32, oldPrice: 55, off: "40%", currency: "₹", unit: "per sqft",
        tag: "discount", desc: "Batch End Clearance", icon: "🧱", type: "marble", co2Saved: 240
    },
    {
        id: "v-003", title: "Ultratech PPC Cement (Damaged Bags)",
        vendor: "Sri Laxmi Cements", dist: "1.8km",
        price: 280, oldPrice: 420, off: "30%", currency: "₹", unit: "per bag",
        tag: "discount", desc: "Torn Packaging — Contents Intact", icon: "🏗️", type: "cement", co2Saved: 55
    }
];

const MOCK_USER_PROFILE = {
    uid: "stub-uid-001",
    displayName: "Arjun Mehta",
    email: "arjun@studioamehta.com",
    entity: "Studio A. Mehta",
    role: "architect",
    coaNumber: "CA/2019/47821",
    verified: true,
    bondRating: 4.8,
    wallet: { balance: 48500, currency: "₹", pendingBonds: 2 },
    impact: { co2Saved: 3840, weightRescued: 1240, transactions: 12 },
    listings: [{ id: "listing-001" }, { id: "listing-003" }],
    joinedAt: "2023-06-15",
    city: "Mumbai",
    badge: "architect"
};

export {
    firebaseConfig, firebaseApp, auth, db, storage,
    FirebaseAuth, FirebaseDB, FirebaseStorage,
    MOCK_LISTINGS, MOCK_VENDORS, MOCK_USER_PROFILE
};
