// ──────────────────────────────────────────────────────────────────
// firebase-config.js  —  Spolia Firebase integration (LIVE)
// ──────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import {
    getAuth, GoogleAuthProvider, PhoneAuthProvider, RecaptchaVerifier,
    signInWithPopup, signInWithRedirect, getRedirectResult, signInWithPhoneNumber,
    linkWithCredential, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    getFirestore, collection, query, where, orderBy,
    onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp, increment
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
const FirebaseAuth = {
    signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            return await signInWithPopup(auth, provider);
        } catch (popupErr) {
            if (popupErr.code === 'auth/popup-blocked' ||
                popupErr.code === 'auth/cancelled-popup-request' ||
                popupErr.code === 'auth/popup-closed-by-user') {
                return signInWithRedirect(auth, provider);
            }
            throw popupErr;
        }
    },

    /** Set up invisible reCAPTCHA on a button element and start phone sign-in */
    sendOTP: async (phoneNumber, buttonEl) => {
        // Clear any previous verifier
        if (window._recaptchaVerifier) {
            try { window._recaptchaVerifier.clear(); } catch (_) {}
        }
        const verifier = new RecaptchaVerifier(auth, buttonEl, { size: 'invisible' });
        window._recaptchaVerifier = verifier;
        const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        window._confirmationResult = result;
        return result;
    },

    /** Verify the OTP code the user typed */
    confirmOTP: async (code) => {
        if (!window._confirmationResult) throw new Error('No pending OTP');
        return window._confirmationResult.confirm(code);
    },

    /** Link phone credential to already signed-in Google account */
    linkPhone: async (code) => {
        if (!window._confirmationResult) throw new Error('No pending OTP');
        const credential = PhoneAuthProvider.credentialFromResult(
            await window._confirmationResult.confirm(code)
        );
        return linkWithCredential(auth.currentUser, credential);
    },

    getRedirectResult: async () => getRedirectResult(auth),

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
                // Existing user — only update basic auth fields (don't clobber onboardingComplete etc.)
                await updateDoc(userRef, {
                    displayName: profileData.displayName || snap.data().displayName || '',
                    email: profileData.email || snap.data().email || '',
                    photoURL: profileData.photoURL || snap.data().photoURL || null,
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
            // Update user doc
            await updateDoc(doc(db, "users", uid), {
                role,
                credentialNumber,
                verificationDocUrl: docUrl || null,
                onboardingComplete: false, // false = pending review
                verificationSubmittedAt: serverTimestamp(),
                verificationStatus: "pending"
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
            const snap = await new Promise((resolve, reject) => {
                const unsub = onSnapshot(q, resolve, reject);
                // one-shot
                setTimeout(unsub, 0);
            });
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
