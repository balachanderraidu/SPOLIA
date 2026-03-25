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
    getFirestore, collection, query, where, orderBy, limit,
    onSnapshot, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, serverTimestamp, increment, limitToLast
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import {
    getMessaging, getToken, onMessage
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

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
let messaging = null;
try {
    messaging = getMessaging(firebaseApp);
} catch (e) {
    console.warn('[Firebase] Messaging not supported or blocked by browser.');
}

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
//   - /users/{uid}                        — User profiles, verification status
//   - /listings/{listingId}               — Material listings (Radar feed)
//   - /bonds/{bondId}                     — Spolia Bond transactions
//   - /disputes/{disputeId}               — Quality issue reports
//   - /chats/{chatId}                     — Bond-gated chat rooms (chatId = bondId)
//   - /chats/{chatId}/messages/{msgId}    — Individual messages
//   - /platformStats/global               — Aggregated platform impact metrics
// ──────────────────────────────────────────────────────────────────
const FirebaseDB = {
    isDemoMode: () => {
        try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; }
    },

    /**
     * Real-time listener for the Radar feed.
     */
    listenToRadar: (filter, onUpdate) => {
        let q;
        const listingsRef = collection(db, "listings");

        if (filter === 'urgent') {
            // Urgent = any listing with isUrgentRescue flag OR upcoming expiry
            // Firestore can't do OR across different fields, so query all and filter client-side
            q = query(listingsRef, orderBy("createdAt", "desc"));
        } else if (filter && filter !== 'all') {
            q = query(listingsRef, where("type", "==", filter), orderBy("createdAt", "desc"));
        } else {
            q = query(listingsRef, orderBy("createdAt", "desc"));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const listings = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(l => l.status !== 'sold'); // exclude sold at client level
            onUpdate(listings);
        }, (err) => {
            console.warn("[FirebaseDB] listenToRadar error:", err);
            onUpdate([]);
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
        return null;
    },

    /**
     * Create a new material listing.
     */
    createListing: async (listingData) => {
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
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

        // If listing is near-expiry, send the seller an in-app rescue alert
        if (user?.uid && listingData.isUrgentRescue && listingData.daysToExpiry != null) {
            const days = listingData.daysToExpiry;
            const urgencyMsg = days <= 3
                ? `🔴 CRITICAL: only ${days} day(s) left! Consider a 40-50% discount to rescue fast.`
                : `🟠 URGENT: ${days} days left. A 25-35% discount drives 3× faster pickups.`;
            FirebaseDB.addNotification(user.uid, {
                type: 'expiry_alert',
                title: '⏳ Rescue Listing Created',
                body: `"${listingData.title}" is now URGENT on the Radar. ${urgencyMsg}`,
                listingId: docRef.id
            }).catch(() => {});
        }

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
        if (FirebaseDB.isDemoMode()) return;
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
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
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
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
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
        if (FirebaseDB.isDemoMode()) return;
        try {
            await updateDoc(doc(db, "bonds", bondId), { status, updatedAt: serverTimestamp() });
        } catch (err) {
            console.warn("[FirebaseDB] updateBondStatus error:", err);
        }
    },

    /**
     * Update a user's wallet and impact stats (called on bond completion).
     * @param {string} uid
     * @param {Object} delta  — e.g. { walletDelta: 5000, co2Delta: 120 }
     */
    updateUserStats: async (uid, { walletDelta = 0, co2Delta = 0, txDelta = 1, pendingBondsDelta = 0 } = {}) => {
        if (FirebaseDB.isDemoMode()) return;
        try {
            const updates = {};
            if (walletDelta)       updates['wallet.balance']       = increment(walletDelta);
            if (pendingBondsDelta) updates['wallet.pendingBonds']   = increment(pendingBondsDelta);
            if (txDelta)           updates['impact.transactions']   = increment(txDelta);
            if (co2Delta)          updates['impact.co2Saved']       = increment(co2Delta);
            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'users', uid), updates);
            }
        } catch (err) {
            console.warn('[FirebaseDB] updateUserStats error:', err);
        }
    },

    /**
     * Submit a seller rating after a completed bond.
     */
    submitRating: async ({ bondId, sellerUid, rating, comment }) => {
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
        try {
            await addDoc(collection(db, "ratings"), {
                bondId, sellerUid, rating, comment: comment || '',
                raterUid: auth.currentUser?.uid || null,
                createdAt: serverTimestamp()
            });
            // Optionally update seller's avg rating on their profile (best-effort)
            if (sellerUid) {
                const profileRef = doc(db, 'users', sellerUid);
                await updateDoc(profileRef, {
                    'stats.ratingCount': increment(1),
                    'stats.ratingSum': increment(rating)
                }).catch(() => {});
            }
        } catch (err) {
            console.warn("[FirebaseDB] submitRating error:", err);
        }
    },

    /**
     * Mark a listing as sold — removes it from the active Radar feed.
     */
    markListingSold: async (listingId) => {
        if (FirebaseDB.isDemoMode()) return;
        try {
            const listingRef = doc(db, "listings", listingId);
            const listingSnap = await getDoc(listingRef);
            const listing = listingSnap.exists() ? listingSnap.data() : null;

            await updateDoc(listingRef, {
                status: 'sold',
                soldAt: serverTimestamp()
            });

            // If listing was a near-expiry rescue, bump the rescue stat
            if (listing?.isUrgentRescue || listing?.expiryDate) {
                setDoc(doc(db, 'platformStats', 'global'), {
                    totalRescuedBeforeExpiry: increment(1)
                }, { merge: true }).catch(() => {});

                // Also bump seller's personal rescue count
                if (listing.seller?.uid || listing.sellerUid) {
                    const sellerUid = listing.seller?.uid || listing.sellerUid;
                    updateDoc(doc(db, 'users', sellerUid), {
                        'stats.rescuedBeforeExpiry': increment(1)
                    }).catch(() => {});
                }
            }
        } catch (err) {
            console.warn("[FirebaseDB] markListingSold error:", err);
        }
    },

    /**
     * Submit a quality dispute report.
     */
    submitDispute: async (disputeData) => {
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
        const user = auth.currentUser;
        await addDoc(collection(db, "disputes"), {
            ...disputeData,
            reporterUid: user?.uid || null,
            status: "open",
            createdAt: serverTimestamp()
        });
    },

    /**
     * Admin: Fetch all disputes
     */
    getDisputes: async (statusFilter = 'open') => {
        try {
            const q = query(
                collection(db, "disputes"),
                where("status", "==", statusFilter),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            console.warn("[FirebaseDB] getDisputes error:", err);
            return [];
        }
    },

    /**
     * Admin: Resolve a dispute
     * resolutionOption: 'refund_buyer' | 'release_seller' | 'dismiss'
     */
    resolveDispute: async (disputeId, bondId, resolutionOption) => {
        try {
            // Update dispute status
            await updateDoc(doc(db, "disputes", disputeId), {
                status: 'resolved',
                adminResolution: resolutionOption,
                resolvedAt: serverTimestamp()
            });

            if (!bondId) return;

            const bondSnap = await getDoc(doc(db, "bonds", bondId));
            if (!bondSnap.exists()) return;
            const bond = bondSnap.data();

            // Handle the bond status and wallet balances
            if (resolutionOption === 'refund_buyer') {
                await updateDoc(doc(db, "bonds", bondId), { status: 'refunded' });
                // Refund buyer's wallet
                if (bond.buyerUid) {
                    await updateDoc(doc(db, "users", bond.buyerUid), {
                        walletBalance: increment(bond.bondAmount)
                    });
                    FirebaseDB.addNotification(bond.buyerUid, {
                        type: 'dispute', title: 'Dispute Resolved', body: `Your dispute for "${bond.listingTitle}" was approved. ₹${bond.bondAmount} has been refunded to your wallet.`, bondId
                    }).catch(()=>{});
                }
                // Notify seller
                if (bond.sellerUid) {
                    FirebaseDB.addNotification(bond.sellerUid, {
                        type: 'dispute', title: 'Dispute Resolved', body: `The dispute for "${bond.listingTitle}" was resolved in favor of the buyer. The bond has been refunded.`, bondId
                    }).catch(()=>{});
                }
            } else if (resolutionOption === 'release_seller') {
                await updateDoc(doc(db, "bonds", bondId), { status: 'completed' });
                // Release to seller's wallet
                if (bond.sellerUid) {
                    await updateDoc(doc(db, "users", bond.sellerUid), {
                        walletBalance: increment(bond.bondAmount)
                    });
                    FirebaseDB.addNotification(bond.sellerUid, {
                        type: 'dispute', title: 'Dispute Resolved', body: `The dispute for "${bond.listingTitle}" was dismissed. ₹${bond.bondAmount} has been released to your wallet.`, bondId
                    }).catch(()=>{});
                }
                if (bond.buyerUid) {
                    FirebaseDB.addNotification(bond.buyerUid, {
                        type: 'dispute', title: 'Dispute Resolved', body: `Your dispute for "${bond.listingTitle}" was dismissed. The bond has been released to the seller.`, bondId
                    }).catch(()=>{});
                }
            } else if (resolutionOption === 'dismiss') {
                // Just dismiss the dispute, bond returns to active
                await updateDoc(doc(db, "bonds", bondId), { status: 'active' });
            }

        } catch (err) {
            console.warn("[FirebaseDB] resolveDispute error:", err);
            throw err;
        }
    },


    /**
     * Submit a wallet withdrawal request
     */
    submitWithdrawal: async (withdrawalData) => {
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
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
     * Fetch user's own bonds — as both buyer AND seller.
     */
    getMyBonds: async (uid) => {
        try {
            const [buyerSnap, sellerSnap] = await Promise.all([
                getDocs(query(
                    collection(db, "bonds"),
                    where("buyerUid", "==", uid),
                    orderBy("createdAt", "desc")
                )),
                getDocs(query(
                    collection(db, "bonds"),
                    where("sellerUid", "==", uid),
                    orderBy("createdAt", "desc")
                ))
            ]);
            const buyerBonds  = buyerSnap.docs.map(d  => ({ id: d.id,  ...d.data() }));
            const sellerBonds = sellerSnap.docs.map(d => ({ id: d.id,  ...d.data() }));
            // Merge + deduplicate (a user could be both buyer and seller in edge case)
            const seen = new Set();
            const all = [...buyerBonds, ...sellerBonds].filter(b => {
                if (seen.has(b.id)) return false;
                seen.add(b.id);
                return true;
            });
            // Sort newest first
            all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            return all;
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

    // ── Chat / Messaging ────────────────────────────────────────────

    /**
     * Get or create a chat room for a given bond.
     * Chat room ID === bond ID for simple lookup.
     * Returns the chatRoomId.
     */
    getOrCreateChatRoom: async (bondId, currentUid, bondData) => {
        const chatRef = doc(db, 'chats', bondId);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
            // Create room and seed a system message
            await setDoc(chatRef, {
                bondId,
                participants: bondData
                    ? [bondData.buyerUid, bondData.sellerUid].filter(Boolean)
                    : [currentUid],
                createdAt: serverTimestamp(),
                lastMessage: null,
                lastMessageAt: null,
                unread: {}
            });
            // Seed system message
            await addDoc(collection(db, 'chats', bondId, 'messages'), {
                type: 'system',
                text: '🔒 Walled chat started for this Spolia Bond. Sharing contact info is not permitted.',
                senderUid: null,
                createdAt: serverTimestamp()
            });
        }
        return bondId;
    },

    /**
     * Send a message to a chat room.
     * Server-side rules verify the sender is a bond participant.
     */
    sendMessage: async (chatRoomId, { text, senderUid, senderName, type = 'user' }) => {
        if (FirebaseDB.isDemoMode()) throw new Error('This action is disabled in Demo Mode.');
        const msgRef = await addDoc(collection(db, 'chats', chatRoomId, 'messages'), {
            text,
            senderUid,
            senderName,
            type,
            createdAt: serverTimestamp()
        });
        // Update room meta
        await updateDoc(doc(db, 'chats', chatRoomId), {
            lastMessage: text.length > 60 ? text.substring(0, 60) + '…' : text,
            lastMessageAt: serverTimestamp()
        });
        return msgRef.id;
    },

    /**
     * Real-time listener for messages in a chat room.
     * Returns last 100 messages in ascending order.
     */
    listenToChat: (chatRoomId, onUpdate) => {
        const q = query(
            collection(db, 'chats', chatRoomId, 'messages'),
            orderBy('createdAt', 'asc'),
            limitToLast(100)
        );
        return onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onUpdate(msgs);
        }, (err) => {
            console.warn('[FirebaseDB] listenToChat error:', err);
            onUpdate([]);
        });
    },

    /**
     * Mark all messages in a chat room as read for a user.
     */
    markChatRead: async (chatRoomId, uid) => {
        try {
            await updateDoc(doc(db, 'chats', chatRoomId), {
                [`unread.${uid}`]: 0
            });
        } catch (_) { /* non-critical */ }
    },

    /**
     * Fetch a single bond by ID (direct doc get).
     */
    getBond: async (bondId) => {
        try {
            const snap = await getDoc(doc(db, 'bonds', bondId));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
        } catch (err) {
            console.warn('[FirebaseDB] getBond error:', err);
        }
        return null;
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
                    totalRescuedBeforeExpiry: 134,
                    seededAt: serverTimestamp()
                });
                console.log("[FirebaseDB] platformStats/global seeded ✓");
            }
        } catch (err) {
            // Non-critical — app works fine without this doc (falls back to mock values)
            console.warn("[FirebaseDB] initPlatformStats:", err.message);
        }
    },

    // ── Notifications ────────────────────────────────────────────────
    // Stored at /notifications/{uid}/items/{notifId}

    /**
     * Real-time listener for a user's notification items.
     * Returns last 30 notifications, newest first.
     */
    listenToNotifications: (uid, onUpdate) => {
        const q = query(
            collection(db, 'notifications', uid, 'items'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );
        return onSnapshot(q, (snap) => {
            const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onUpdate(notifs);
        }, (err) => {
            console.warn('[FirebaseDB] listenToNotifications error:', err);
            onUpdate([]);
        });
    },

    /**
     * Add a notification for a user.
     * type: 'bond_status' | 'chat_message' | 'dispute' | 'system' | 'expiry_alert' | 'rescue_badge'
     */
    addNotification: async (uid, { type, title, body, bondId, chatId, listingId }) => {
        try {
            await addDoc(collection(db, 'notifications', uid, 'items'), {
                type, title, body,
                bondId:    bondId    || null,
                chatId:    chatId    || null,
                listingId: listingId || null,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.warn('[FirebaseDB] addNotification error:', err);
        }
    },

    /**
     * Mark all unread notifications as read for a user.
     */
    markNotificationsRead: async (uid) => {
        try {
            const q = query(
                collection(db, 'notifications', uid, 'items'),
                where('read', '==', false),
                limit(30)
            );
            const snap = await getDocs(q);
            const updates = snap.docs.map(d => updateDoc(d.ref, { read: true }));
            await Promise.all(updates);
        } catch (err) {
            console.warn('[FirebaseDB] markNotificationsRead error:', err);
        }
    },

    /**
     * Request Push Notification permissions and save FCM token to user profile
     */
    setupPushNotifications: async (uid) => {
        if (!messaging) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const token = await getToken(messaging, { 
                    serviceWorkerRegistration: registration 
                }).catch((e) => {
                    console.warn('[FirebaseDB] error getting token', e);
                    return null;
                });
                
                if (token) {
                    await updateDoc(doc(db, "users", uid), {
                        fcmToken: token,
                        fcmUpdatedAt: serverTimestamp()
                    });
                    console.log("[FirebaseDB] FCM token saved for push notifications.");
                }
                
                // Handle foreground messages
                onMessage(messaging, (payload) => {
                    console.log("[FirebaseDB] Foreground push received:", payload);
                });
            }
        } catch (err) {
            console.warn('[FirebaseDB] Push notification setup failed:', err);
        }
    },


    /**
     * Real-time listener for platform-wide impact stats.
     * Used by impact.js to update the live display.
     * @param {Function} onUpdate - callback(stats)
     * @returns {Function} unsubscribe
     */
    listenToPlatformStats: (onUpdate) => {
        return onSnapshot(doc(db, 'platformStats', 'global'), (snap) => {
            if (snap.exists()) {
                onUpdate({ id: snap.id, ...snap.data() });
            } else {
                // Doc not yet seeded — seed it and return defaults
                FirebaseDB.initPlatformStats().catch(() => {});
                onUpdate({
                    totalCo2Saved:            14500,
                    totalTransactions:        847,
                    totalWeightKg:            124000,
                    totalValueRescued:        28000000,
                    totalRescuedBeforeExpiry: 134
                });
            }
        }, (err) => {
            console.warn('[FirebaseDB] listenToPlatformStats error:', err);
            onUpdate({
                totalCo2Saved:            14500,
                totalTransactions:        847,
                totalWeightKg:            124000,
                totalValueRescued:        28000000,
                totalRescuedBeforeExpiry: 134
            });
        });
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
        imageUrls: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"],
        seller: { uid: "uid-002", name: "Studio Mehta", badge: "architect", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
        location: { lat: 19.076, lng: 72.877, label: "Bandra West, Mumbai" },
        description: "Premium book-matched travertine slabs from a completed villa project in Bandra. 240 sqft available, minimal wear, full original 20mm thickness. Certificate of origin from the original importer available.",
        specs: { thickness: "20mm", finish: "Honed", color: "Warm Beige", grade: "Premium", origin: "Tivoli, Lazio, Italy" },
        stats: { ratingCount: 14, ratingSum: 67 }
    },
    {
        id: "listing-002", title: "Structural Steel I-Beams (ISMB 250)",
        type: "steel", quantity: 8, unit: "pieces", price: 12500, currency: "₹",
        distance: 3.4, co2Saved: 2100, bondProtected: true, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&q=80"],
        seller: { uid: "uid-003", name: "Apex Constructions", badge: "contractor", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80" },
        location: { lat: 19.120, lng: 72.850, label: "Andheri East, Mumbai" },
        description: "ISMB 250 I-beams, 6m lengths. De-roofed from 3-storey commercial project in Andheri. Grade IS 2062 E250, minimal surface rust only. Third-party load test certificates available. Priced at 35% below scrap dealer rates.",
        specs: { grade: "IS 2062 E250", length: "6m", section: "ISMB 250", condition: "Used - Good", yield_strength: "250 MPa" },
        stats: { ratingCount: 9, ratingSum: 43 }
    },
    {
        id: "listing-003", title: "Burma Teak Wood Rafters",
        type: "wood", quantity: 50, unit: "pieces", price: 4200, currency: "₹",
        distance: 0.8, co2Saved: 320, bondProtected: false, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1542621334-a254cf47733d?w=600&q=80"],
        seller: { uid: "uid-004", name: "Rajan & Associates", badge: "contractor", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
        location: { lat: 19.065, lng: 72.832, label: "Mahim, Mumbai" },
        description: "Burma teak rafters salvaged from century-old heritage bungalow demolition in Mahim. Dense grain, naturally aged. Architect-approved for reuse. Ideal for feature ceilings, furniture, or landscaping.",
        specs: { species: "Burma Teak (Tectona grandis)", dimensions: "100×50mm", length: "3.6m", age: "~80 years", density: "650 kg/m³" },
        stats: { ratingCount: 22, ratingSum: 108 }
    },
    {
        id: "listing-004", title: "Block C Basement Clearance — URGENT",
        type: "bulk", quantity: 1, unit: "lot", price: 45000, currency: "₹",
        distance: 0.5, co2Saved: 850, bondProtected: false, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600&q=80"],
        community: "MyHome Avatar",
        seller: { uid: "uid-005", name: "MyHome RWA", badge: "verified", avatar: null },
        location: { lat: 19.045, lng: 72.900, label: "Chembur, Mumbai" },
        description: "Full basement clearance from Block C renovation — MyHome Avatar. Cement bags EXPIRE in 6 days, rescue before they harden! Buyer arranges transport. Pickup any time 8am–6pm. WhatsApp security desk for access.",
        specs: { contents: "50× Cement Bags, 200 sqft Vitrified Tiles, 10× Ext. Paint Buckets", pickup: "Mon–Sat 8am–6pm", access: "Security desk clearance required" },
        contents: [
            { n: "Cement Bags", q: "50 Nos" },
            { n: "Vitrified Tiles", q: "200 sqft" },
            { n: "Ext. Paint", q: "10 Buckets" }
        ],
        expiryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        daysToExpiry: 6,
        isUrgentRescue: true
    },
    {
        id: "listing-005", title: "Italian Carrara Marble Slabs",
        type: "marble", quantity: 120, unit: "sqft", price: 420, currency: "₹",
        distance: 2.3, co2Saved: 960, bondProtected: true, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1618221381711-42ca8ab6e908?w=600&q=80"],
        seller: { uid: "uid-006", name: "Marble World India", badge: "vendor", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80" },
        location: { lat: 19.088, lng: 72.862, label: "Khar West, Mumbai" },
        description: "Authentic Italian Carrara white marble 600×600mm slabs. Surplus from luxury apartment project in Khar. Pristine condition, never installed. Architect-approved. Retail value ₹750/sqft — selling at ₹420.",
        specs: { origin: "Carrara, Italy", thickness: "18mm", finish: "Polished", color: "White with grey veining", size: "600×600mm" },
        stats: { ratingCount: 31, ratingSum: 153 }
    },
    {
        id: "listing-006", title: "Marino BWP 18mm Plywood Sheets",
        type: "wood", quantity: 2, unit: "pieces", price: 3200, currency: "₹",
        distance: 2.1, co2Saved: 45, bondProtected: false, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80"],
        seller: { uid: "uid-007", name: "SSC Constructions", badge: "contractor", avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=100&q=80" },
        location: { lat: 19.058, lng: 72.841, label: "Matunga, Mumbai" },
        description: "BWP grade plywood from a shuttering project. Full 8×4ft sheets, 18mm thickness. Used once for formwork only — no staining, edges clean. Retail ₹4500/sheet.",
        specs: { grade: "BWP (Boiling Waterproof)", size: "8×4 ft", thickness: "18mm", brand: "Marino", layers: "13-ply" }
    },
    {
        id: "listing-007", title: "Tata Tiscon 18mm TMT Rebar",
        type: "steel", quantity: 5, unit: "pieces", price: 4500, currency: "₹",
        distance: 5.0, co2Saved: 120, bondProtected: true, verified: false,
        imageUrls: ["https://images.unsplash.com/photo-1563461661026-49631dd5d68e?w=600&q=80"],
        seller: { uid: "uid-008", name: "SSC Constructions", badge: "contractor", avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=100&q=80" },
        location: { lat: 19.100, lng: 72.895, label: "Ghatkopar, Mumbai" },
        description: "Tata Tiscon Fe500D 12m bars. Cut-offs from column reinforcement. Surface rust from 3 months open storage — structurally sound, mill test certificates available.",
        specs: { brand: "Tata Tiscon", length: "12m", diameter: "18mm", grade: "Fe500D", condition: "Used - Good" }
    },
    {
        id: "listing-008", title: "Ashirvad CPVC Pipes — 2 Days Left!",
        type: "plumbing", quantity: 10, unit: "pieces", price: 850, currency: "₹",
        distance: 0.8, co2Saved: 12, bondProtected: false, verified: false, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80"],
        community: "MyHome Avatar",
        seller: { uid: "uid-009", name: "MyHome RWA", badge: "verified", avatar: null },
        location: { lat: 19.046, lng: 72.901, label: "Chembur, Mumbai" },
        description: "Surplus Ashirvad CPVC hot & cold pipes from a 3-BHK toilet renovation. NEVER INSTALLED. UV degradation begins after 90 days exposure — rescue now! 3m per piece, fittings included.",
        specs: { brand: "Ashirvad", type: "CPVC Schedule 40", size: "25mm (1 inch)", length: "3m per piece", fittings: "Yes — elbows and tees included" },
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        daysToExpiry: 2,
        isUrgentRescue: true
    },
    {
        id: "listing-009", title: "Birla A1 PPC Cement (Near Expiry)",
        type: "cement", quantity: 25, unit: "bags", price: 280, currency: "₹",
        distance: 1.5, co2Saved: 62, bondProtected: false, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1590496793929-36417d3117de?w=600&q=80"],
        seller: { uid: "uid-010", name: "Balaji Hardware Stores", badge: "vendor", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&q=80" },
        location: { lat: 19.072, lng: 72.845, label: "Dadar, Mumbai" },
        description: "Birla A1 PPC cement bags, 28 days to expiry. Perfect for immediate plastering or flooring work. MRP ₹400/bag — rescue price ₹280. Collect from Dadar warehouse.",
        specs: { brand: "Birla A1", grade: "PPC", weight: "50kg/bag", expiry: "28 days remaining", strength: "43 MPa" },
        expiryDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        daysToExpiry: 28,
        isUrgentRescue: false
    },
    {
        id: "listing-010", title: "Handmade Red Clay Bricks — 5000 Nos",
        type: "brick", quantity: 5000, unit: "pieces", price: 12, currency: "₹",
        distance: 5.1, co2Saved: 1800, bondProtected: true, verified: false,
        imageUrls: ["https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=600&q=80"],
        seller: { uid: "uid-011", name: "BuildRight Materials", badge: "vendor", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&q=80" },
        location: { lat: 19.045, lng: 72.900, label: "Chembur, Mumbai" },
        description: "Traditional handmade red clay bricks from Panvel farmhouse demolition. Class 1 quality, compressive strength tested. Ideal for feature walls, garden landscaping, or restoration projects. Minimum pickup: 500 pcs.",
        specs: { size: "230×110×75mm", type: "Handmade Clay — Class 1", compressiveStrength: "7.5 MPa", condition: "Cleaned", minPickup: "500 pcs" }
    },
    {
        id: "listing-011", title: "Reclaimed Vintage Floor Tiles (Athangudi)",
        type: "stone", quantity: 180, unit: "sqft", price: 320, currency: "₹",
        distance: 1.9, co2Saved: 390, bondProtected: true, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&q=80"],
        seller: { uid: "uid-012", name: "Heritage Salvage Co.", badge: "vendor", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80" },
        location: { lat: 19.068, lng: 72.858, label: "Dadar West, Mumbai" },
        description: "Authentic Chettinad Athangudi hand-painted cement tiles, circa 1940s. Salvaged from a colonial bungalow restoration project. 5 distinct patterns available. A rare find.",
        specs: { origin: "Chettinad, Tamil Nadu", age: "~80 years", size: "12×12 inch", patterns: "5 distinct geometric designs", condition: "Good – minor chips on <5%" },
        stats: { ratingCount: 7, ratingSum: 35 }
    },
    {
        id: "listing-012", title: "Mild Steel Angles & Channels",
        type: "steel", quantity: 20, unit: "pieces", price: 2800, currency: "₹",
        distance: 4.2, co2Saved: 560, bondProtected: false, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80"],
        seller: { uid: "uid-003", name: "Apex Constructions", badge: "contractor", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80" },
        location: { lat: 19.115, lng: 72.860, label: "Andheri West, Mumbai" },
        description: "MS Angles 50×50×6mm and Channels ISMC 100, 6m lengths. From mezzanine demolition. Surface rust cleaned. Mix lot — sold as a set. Ideal for fabrication or shoring.",
        specs: { angle: "50×50×6mm MS Angle (10 pcs)", channel: "ISMC 100 @ 6m (10 pcs)", grade: "IS 2062 E250", condition: "Used - Good" }
    },
    {
        id: "listing-013", title: "Copper Electrical Wiring (Virgin)",
        type: "plumbing", quantity: 400, unit: "meters", price: 85, currency: "₹",
        distance: 2.7, co2Saved: 88, bondProtected: true, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"],
        seller: { uid: "uid-013", name: "Modern Electricals", badge: "vendor", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
        location: { lat: 19.082, lng: 72.875, label: "Bandra East, Mumbai" },
        description: "Leftover Finolex 4 sq mm 3-core copper wire — never used, still coiled. Surplus from office wiring project. Available in 50m rolls. Market rate ₹145/m — rescue at ₹85.",
        specs: { brand: "Finolex", size: "4 sq mm", type: "3-core PVC insulated", length: "50m rolls", isRMSApproved: true }
    },
    {
        id: "listing-014", title: "Porcelain Large Format Tiles (80×160cm)",
        type: "marble", quantity: 60, unit: "sqft", price: 280, currency: "₹",
        distance: 3.1, co2Saved: 145, bondProtected: false, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600&q=80"],
        seller: { uid: "uid-006", name: "Marble World India", badge: "vendor", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80" },
        location: { lat: 19.092, lng: 72.870, label: "Bandra West, Mumbai" },
        description: "Stile Italiane large format porcelain tiles, 80×160cm. Leftover from a penthouse project. Rectified edges, matte finish. Only 60 sqft available — enough for a bathroom + feature wall. Italian import ₹650/sqft retail.",
        specs: { brand: "Stile Italiane", size: "80×160cm", finish: "Matte Rectified", thickness: "10mm", type: "Full-body porcelain" },
        stats: { ratingCount: 5, ratingSum: 24 }
    },
    {
        id: "listing-015", title: "Indonesian Stripped Coconut Lumber",
        type: "wood", quantity: 30, unit: "pieces", price: 1800, currency: "₹",
        distance: 6.3, co2Saved: 210, bondProtected: false, verified: false,
        imageUrls: ["https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&q=80"],
        seller: { uid: "uid-014", name: "Green Build Supplies", badge: "vendor", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80" },
        location: { lat: 19.138, lng: 72.898, label: "Malad East, Mumbai" },
        description: "Stripped coconut palm lumber (Cocos nucifera), sustainably sourced from Goa plantation clearance. Dense, pest-resistant. Popular for rustic furniture and outdoor decks. Natural oil finish applied.",
        specs: { species: "Cocos nucifera (Coconut Palm)", dimensions: "75×100mm rough sawn", length: "2.4m–3m", treatment: "Natural linseed oil", density: "700 kg/m³" }
    },
    {
        id: "listing-016", title: "GI Scaffolding Pipes — 4-Day Rescue!",
        type: "steel", quantity: 80, unit: "pieces", price: 650, currency: "₹",
        distance: 1.2, co2Saved: 340, bondProtected: false, verified: false,
        imageUrls: ["https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80"],
        community: "Shapoorji Pallonji Towers",
        seller: { uid: "uid-015", name: "Shapoorji Towers RWA", badge: "verified", avatar: null },
        location: { lat: 19.084, lng: 72.872, label: "Kurla West, Mumbai" },
        description: "GI scaffolding pipes, 3m length, 48mm OD. Site clearance — construction complete. 80 pieces available. RESCUE REQUIRED within 4 days before contractor clears them to scrap. ₹650/piece vs ₹1,200 market. Ideal for pergolas, greenhouse frames, or pipeline work.",
        specs: { material: "GI (Hot-Dip Galvanized)", OD: "48mm", length: "3m per piece", wallThickness: "3.2mm", condition: "Used - Good" },
        expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        daysToExpiry: 4,
        isUrgentRescue: true
    },
    {
        id: "listing-017", title: "Reclaimed Chevron Oak Flooring",
        type: "wood", quantity: 220, unit: "sqft", price: 520, currency: "₹",
        distance: 3.4, co2Saved: 480, bondProtected: true, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=600&q=80"],
        seller: { uid: "uid-016", name: "Rohan Interiors", badge: "designer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
        location: { lat: 19.075, lng: 72.863, label: "Santa Cruz West, Mumbai" },
        description: "Solid oak chevron-pattern flooring from a Juhu bungalow refurbishment. 220 sqft total, 18mm solid oak, pre-finished. Original retail ₹1,100/sqft. Minimum lift: 50 sqft. A rare find for residential designers.",
        specs: { species: "European Oak", pattern: "Chevron 60°", thickness: "18mm solid", finish: "Pre-finished UV lacquer", width: "70mm stave" },
        stats: { ratingCount: 12, ratingSum: 58 }
    },
    {
        id: "listing-018", title: "Society Pool Clearance — Pump & Filters",
        type: "plumbing", quantity: 1, unit: "lot", price: 38000, currency: "₹",
        distance: 1.7, co2Saved: 190, bondProtected: true, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80"],
        community: "Sea Breeze CHS",
        seller: { uid: "uid-017", name: "Sea Breeze CHS", badge: "verified", avatar: null },
        location: { lat: 19.062, lng: 72.827, label: "Juhu, Mumbai" },
        description: "Society swimming pool undergoing full renovation. De-commissioning Zodiac Cyclone pump (5HP), Pahwa sand filter (dia 1.2m), Polaris auto cleaner, and all associated GI pipework. Buyer responsible for disconnection and removal. Pool engineer available to assist.",
        specs: { pump: "Zodiac Cyclone 5HP (2019)", filter: "Pahwa Sand Filter 1.2m dia", cleaner: "Polaris Vac-Sweep 180", condition: "Working — service records available" },
        contents: [
            { n: "Zodiac Cyclone Pump (5HP)", q: "1 No" },
            { n: "Sand Filter 1.2m", q: "1 No" },
            { n: "Polaris Auto Cleaner", q: "1 No" }
        ]
    },
    {
        id: "listing-019", title: "Office Furniture Lot — Workstations & Chairs",
        type: "bulk", quantity: 1, unit: "lot", price: 125000, currency: "₹",
        distance: 2.2, co2Saved: 620, bondProtected: false, verified: true,
        imageUrls: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"],
        seller: { uid: "uid-018", name: "Raka Office Solutions", badge: "vendor", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&q=80" },
        location: { lat: 19.094, lng: 72.868, label: "Andheri East, Mumbai" },
        description: "Full office clearance — 30-seat startup office winding down. Includes 30 Godrej modular workstations, 30 ergonomic mesh chairs, 5 glass-top conference tables, kitchen cabinetry, and reception counter. Everything in working condition. Inspection welcome.",
        specs: { workstations: "30× Godrej Prima 1.2m", chairs: "30× Featherlite ergonomic mesh", tables: "5× Glass-top 6-seater", condition: "2 years old — very good" },
        contents: [
            { n: "Godrej Prima Workstations", q: "30 Nos" },
            { n: "Ergonomic Chairs", q: "30 Nos" },
            { n: "Conference Tables", q: "5 Nos" }
        ]
    },
    {
        id: "listing-020", title: "Designer Zellige Moroccan Tiles",
        type: "marble", quantity: 90, unit: "sqft", price: 680, currency: "₹",
        distance: 2.8, co2Saved: 165, bondProtected: true, verified: true, archApproved: true,
        imageUrls: ["https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&q=80"],
        seller: { uid: "uid-016", name: "Rohan Interiors", badge: "designer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
        location: { lat: 19.068, lng: 72.855, label: "Worli, Mumbai" },
        description: "Hand-made Moroccan Zellige mosaic tiles in ocean blue and terracotta colourways. 90 sqft total. Surplus from a luxury hospitality project. Each tile slightly irregular — the hallmark of authentic Zellige craft. Original import cost ₹1,400/sqft. A rare material rarely seen on Spolia.",
        specs: { origin: "Fez, Morocco", style: "Zellige Mosaic", colors: "Ocean Blue & Terracotta", size: "10×10cm irregular", finish: "Handmade unglazed" },
        stats: { ratingCount: 3, ratingSum: 15 }
    }
];

const MOCK_VENDORS = [
    {
        id: "v-001", title: "Asian Paints Ace Exterior (20L)",
        vendor: "Ravi Hardware & Paints", dist: "3.5km",
        price: 2800, oldPrice: 4500, off: "35%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80",
        tag: "expiry", desc: "Near Expiry (2 Months)", icon: "🎨", type: "chem", co2Saved: 18,
        desc2: "Water-based exterior emulsion. Full 20L cans, 2 months to expiry. Perfect for immediate project use. MRP ₹4500 — clearing at cost."
    },
    {
        id: "v-002", title: "Kajaria 2×2 Vitrified Tiles",
        vendor: "Balaji Tiles & Sanitary", dist: "5.2km",
        price: 32, oldPrice: 55, off: "40%", currency: "₹", unit: "per sqft",
        imageUrl: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=400&q=80",
        tag: "discount", desc: "Batch End Clearance", icon: "🧱", type: "marble", co2Saved: 240,
        desc2: "Kajaria Eternity series, 600×600mm. Batch-end clearance — 850 sqft available. Premium vitrified at 40% off retail. Minimum 100 sqft order."
    },
    {
        id: "v-003", title: "Ultratech PPC Cement (Damaged Bags)",
        vendor: "Sri Lakshmi Cements", dist: "1.8km",
        price: 280, oldPrice: 420, off: "30%", currency: "₹", unit: "per bag",
        imageUrl: "https://images.unsplash.com/photo-1590496793929-36417d3117de?w=400&q=80",
        tag: "discount", desc: "Torn Packaging — Contents Intact", icon: "🏗️", type: "cement", co2Saved: 55,
        desc2: "Ultratech OPC 53 grade. Bags have minor tears from transport — cement completely intact. Structurally equivalent to sealed bags. 30% off MRP."
    },
    {
        id: "v-004", title: "Jaquar Alto Basin Mixer Set",
        vendor: "Patel Sanitaryware", dist: "2.9km",
        price: 3200, oldPrice: 5800, off: "45%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80",
        tag: "discount", desc: "Display Model Clearance", icon: "🚰", type: "plumbing", co2Saved: 8,
        desc2: "Jaquar Alto series chrome basin mixer tap. Display model — never plumbed in. Minor scratches on the aerator only. Full 5-year Jaquar warranty card included."
    },
    {
        id: "v-005", title: "Hettich Soft-Close Drawer Systems (×10)",
        vendor: "Furniture Hardware Hub", dist: "4.1km",
        price: 4500, oldPrice: 9000, off: "50%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
        tag: "discount", desc: "Surplus from Kitchen Project", icon: "🔩", type: "hardware", co2Saved: 14,
        desc2: "Set of 10 Hettich ArciTech 94H soft-close drawer systems, 500mm depth. Surplus from a modular kitchen project cancellation. Full extension, push-to-open compatible. Retail ₹900/set."
    },
    {
        id: "v-006", title: "Pidilite Dr. Fixit Waterproofing (5kg)",
        vendor: "BM Chemicals, Dadar", dist: "1.3km",
        price: 420, oldPrice: 680, off: "38%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80",
        tag: "expiry", desc: "Near Expiry (6 Weeks)", icon: "🧴", type: "chem", co2Saved: 6,
        desc2: "Dr. Fixit Roofseal Plus 5kg pails. Near shelf-life end. Identical performance when applied immediately. Outstanding for terrace waterproofing. 38% below trade price."
    },
    {
        id: "v-007", title: "Hindware Vitreous China WC Suite",
        vendor: "Royal Bath Gallery", dist: "6.8km",
        price: 7500, oldPrice: 14000, off: "46%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80",
        tag: "discount", desc: "Batchelor Model Discontinued", icon: "🛁", type: "plumbing", co2Saved: 22,
        desc2: "Hindware Atelier compact WC suite with soft-close seat, flush valve, and concealed cistern. Model discontinued — floor stock only 3 sets remaining. Full warranty. Retail ₹14,000."
    },
    {
        id: "v-008", title: "Fevicol Speedx Waterproof Adhesive (1 kg ×10)",
        vendor: "BM Chemicals, Dadar", dist: "1.3km",
        price: 1650, oldPrice: 2800, off: "40%", currency: "₹",
        imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80",
        tag: "expiry", desc: "Near Expiry (2 Months)", icon: "🧴", type: "chem", co2Saved: 12,
        desc2: "Fevicol Speedx 1 kg pails — contact adhesive for laminates, rubber, leather. 2 months shelf-life remaining. Identical performance when applied immediately."
    },
    {
        id: "v-009", title: "Fosroc Tile Grout — 25 kg Bags (×8)",
        vendor: "Sri Lakshmi Cements", dist: "1.8km",
        price: 240, oldPrice: 420, off: "43%", currency: "₹", unit: "per bag",
        imageUrl: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=400&q=80",
        tag: "discount", desc: "Discontinued Shade (Ivory)", icon: "🧱", type: "cement", co2Saved: 9,
        desc2: "Fosroc sanded tile grout in Ivory shade — discontinued. 8 × 25 kg bags. Perfect for terracotta and marble joints. MRP ₹420."
    },
    {
        id: "v-010", title: "Philips CorePro LED Panels 600×600 (×20)",
        vendor: "Raka Office Solutions", dist: "2.2km",
        price: 650, oldPrice: 1200, off: "46%", currency: "₹", unit: "per panel",
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
        tag: "discount", desc: "Office Clearance", icon: "💡", type: "hardware", co2Saved: 4,
        desc2: "Philips 36W CorePro LED panels from office clearance. 20 units. 3-year Philips warranty card included. Surface or recessed mount. Perfect for false ceiling replacement."
    }
];

const MOCK_USER_PROFILE = {
    uid: "stub-uid-001",
    displayName: "Arjun Mehta",
    email: "arjun@studioamehta.com",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    entity: "Studio A. Mehta",
    role: "architect",
    credentialNumber: "COA/MH/2019/47821",
    verified: true,
    onboardingComplete: true,
    bondRating: 4.8,
    verificationStatus: "approved",
    verificationDocUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    wallet: { balance: 48500, currency: "₹", pendingBonds: 2 },
    impact: { co2Saved: 3840, weightRescued: 12400, transactions: 14, txGoal: 20, co2Goal: 5000 },
    stats: { ratingCount: 18, ratingSum: 86, rescuedBeforeExpiry: 4 },
    listings: [{ id: "listing-001" }, { id: "listing-003" }, { id: "listing-005" }, { id: "listing-011" }],
    joinedAt: "2023-06-15",
    city: "Mumbai",
    badge: "architect",
    bio: "Principal Architect at Studio A. Mehta. 12 years in adaptive reuse and sustainable design. COA registered. Passionate about reclaiming materials from Mumbai’s urban churn.",
    preferences: { email: true, push: true, sms: false }
};

const MOCK_BONDS = [
    {
        id: "bond-demo-001",
        listingId: "listing-001", listingTitle: "Reclaimed Italian Travertine",
        listingType: "stone",
        buyerUid: "stub-uid-001", buyerName: "Arjun Mehta",
        sellerUid: "uid-006", sellerName: "Marble World India",
        bondAmount: 43200, currency: "₹",
        quantity: 240, unit: "sqft",
        status: "completed",
        co2Saved: 480, weightKg: 1200,
        createdAt: { seconds: Math.floor(Date.now()/1000) - 15 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 15 * 24 * 3600)*1000); } },
        completedAt: { seconds: Math.floor(Date.now()/1000) - 9 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 9 * 24 * 3600)*1000); } },
        pickupAddress: "Khar West, Mumbai",
        notes: "Tiles were in excellent condition, exactly as described. Smooth transaction."
    },
    {
        id: "bond-demo-002",
        listingId: "listing-003", listingTitle: "Burma Teak Wood Rafters",
        listingType: "wood",
        buyerUid: "stub-uid-001", buyerName: "Arjun Mehta",
        sellerUid: "uid-004", sellerName: "Rajan & Associates",
        bondAmount: 84000, currency: "₹",
        quantity: 20, unit: "pieces",
        status: "active",
        co2Saved: 128, weightKg: 400,
        createdAt: { seconds: Math.floor(Date.now()/1000) - 3 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 3 * 24 * 3600)*1000); } },
        pickupAddress: "Mahim, Mumbai",
        notes: "Pickup scheduled for Saturday 10am"
    },
    {
        id: "bond-demo-003",
        listingId: "listing-011", listingTitle: "Reclaimed Vintage Floor Tiles (Athangudi)",
        listingType: "stone",
        buyerUid: "uid-999", buyerName: "Priya Sharma",
        sellerUid: "stub-uid-001", sellerName: "Arjun Mehta",
        bondAmount: 17280, currency: "₹",
        quantity: 54, unit: "sqft",
        status: "pending",
        co2Saved: 117, weightKg: 180,
        createdAt: { seconds: Math.floor(Date.now()/1000) - 1 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 1 * 24 * 3600)*1000); } },
        pickupAddress: "Dadar West, Mumbai",
        notes: ""
    },
    {
        id: "bond-demo-004",
        listingId: "listing-017", listingTitle: "Reclaimed Chevron Oak Flooring",
        listingType: "wood",
        buyerUid: "stub-uid-001", buyerName: "Arjun Mehta",
        sellerUid: "uid-016", sellerName: "Rohan Interiors",
        bondAmount: 57200, currency: "₹",
        quantity: 110, unit: "sqft",
        status: "completed",
        co2Saved: 240, weightKg: 600,
        createdAt: { seconds: Math.floor(Date.now()/1000) - 21 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 21 * 24 * 3600)*1000); } },
        completedAt: { seconds: Math.floor(Date.now()/1000) - 14 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 14 * 24 * 3600)*1000); } },
        pickupAddress: "Santa Cruz West, Mumbai",
        notes: "Perfect pre-finished chevron boards. Seller had them stacked and accessible. Highly recommended.",
        rated: true
    },
    {
        id: "bond-demo-005",
        listingId: "listing-019", listingTitle: "Office Furniture Lot — Workstations & Chairs",
        listingType: "bulk",
        buyerUid: "stub-uid-001", buyerName: "Arjun Mehta",
        sellerUid: "uid-018", sellerName: "Raka Office Solutions",
        bondAmount: 62500, currency: "₹",
        quantity: 1, unit: "lot",
        status: "disputed",
        co2Saved: 0, weightKg: 0,
        createdAt: { seconds: Math.floor(Date.now()/1000) - 6 * 24 * 3600, toDate: function(){ return new Date((Math.floor(Date.now()/1000) - 6 * 24 * 3600)*1000); } },
        pickupAddress: "Andheri East, Mumbai",
        notes: "Dispute raised: chairs not as described in listing. Mediation in progress."
    }
];

const MOCK_NOTIFICATIONS = [
    {
        id: "notif-001",
        type: "bond_status",
        title: "Bond Completed — Travertine",
        body: "Your Spolia Bond for “Reclaimed Italian Travertine” (240 sqft) has been completed. ₹43,200 is available in your wallet.",
        bondId: "bond-demo-001",
        read: true,
        createdAt: { toDate: () => new Date(Date.now() - 9 * 24 * 3600 * 1000) }
    },
    {
        id: "notif-002",
        type: "bond_status",
        title: "New Bond Request — Athangudi Tiles",
        body: "Priya Sharma (Interior Designer, Verified) has placed a Spolia Bond for 54 sqft of your Athangudi tiles. Review and confirm.",
        bondId: "bond-demo-003",
        read: false,
        createdAt: { toDate: () => new Date(Date.now() - 22 * 3600 * 1000) }
    },
    {
        id: "notif-003",
        type: "expiry_alert",
        title: "⌛ Rescue Alert — Block C Basement",
        body: "Block C Basement Clearance is expiring in 6 days. Consider lowering the price to attract rescuers faster.",
        listingId: "listing-004",
        read: false,
        createdAt: { toDate: () => new Date(Date.now() - 2 * 3600 * 1000) }
    },
    {
        id: "notif-004",
        type: "rescue_badge",
        title: "🌱 Rescue Badge Earned!",
        body: "You’ve rescued 4 near-expiry materials this month. You’ve earned the ‘Guardian’ rescue badge on your profile.",
        read: true,
        createdAt: { toDate: () => new Date(Date.now() - 5 * 24 * 3600 * 1000) }
    },
    {
        id: "notif-005",
        type: "chat_message",
        title: "Message from Rajan & Associates",
        body: "\"Pickup on Saturday confirmed. Please bring your COA registration card for builder access.\"",
        bondId: "bond-demo-002",
        chatId: "bond-demo-002",
        read: false,
        createdAt: { toDate: () => new Date(Date.now() - 45 * 60 * 1000) }
    },
    {
        id: "notif-006",
        type: "wallet",
        title: "💰 ₹43,200 Credited to Wallet",
        body: "Funds from the Travertine rescue bond have been released. Your wallet balance is now ₹48,500. Withdraw anytime.",
        read: true,
        createdAt: { toDate: () => new Date(Date.now() - 9 * 24 * 3600 * 1000 + 3600000) }
    },
    {
        id: "notif-007",
        type: "new_listing",
        title: "📍 New Near-You: GI Scaffolding Pipes",
        body: "Shapoorji Towers RWA listed 80 GI scaffolding pipes 1.2 km from you — URGENT RESCUE, 4 days before contractor scraps them.",
        listingId: "listing-016",
        read: false,
        createdAt: { toDate: () => new Date(Date.now() - 3 * 3600 * 1000) }
    },
    {
        id: "notif-008",
        type: "trending",
        title: "🔥 Your listing is trending!",
        body: "\"Reclaimed Italian Travertine\" has been viewed 34 times today. 3 users have it saved — consider lowering the price to trigger a quick bond.",
        listingId: "listing-001",
        read: true,
        createdAt: { toDate: () => new Date(Date.now() - 6 * 24 * 3600 * 1000) }
    }
];

export {
    firebaseConfig, firebaseApp, auth, db, storage,
    FirebaseAuth, FirebaseDB, FirebaseStorage,
    MOCK_LISTINGS, MOCK_VENDORS, MOCK_USER_PROFILE, MOCK_BONDS, MOCK_NOTIFICATIONS
};
