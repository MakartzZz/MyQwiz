import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseAuth } from "../config/firebase.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const authPersistenceReady = setPersistence(firebaseAuth, browserLocalPersistence);

const withPersistentAuth = async (operation) => {
  await authPersistenceReady;
  return operation();
};

export const registerWithEmailAndPassword = (email, password) =>
  withPersistentAuth(() =>
    createUserWithEmailAndPassword(firebaseAuth, email.trim(), password),
  );

export const signInWithEmailPassword = (email, password) =>
  withPersistentAuth(() =>
    signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
  );

export const signInWithGoogle = () =>
  withPersistentAuth(() => signInWithPopup(firebaseAuth, googleProvider));

export const requestPasswordReset = (email) =>
  withPersistentAuth(() => sendPasswordResetEmail(firebaseAuth, email.trim()));

export const linkGoogleToCurrentAccount = async () => {
  await authPersistenceReady;
  if (!firebaseAuth.currentUser) {
    throw new Error("Debes iniciar sesión antes de enlazar Google.");
  }
  return linkWithPopup(firebaseAuth.currentUser, googleProvider);
};

export const linkPasswordToCurrentAccount = async (password) => {
  await authPersistenceReady;
  const user = firebaseAuth.currentUser;
  if (!user?.email) {
    throw new Error("La cuenta de Google debe tener un correo para agregar una contraseña.");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  return linkWithCredential(user, credential);
};

export const getLinkedSignInMethods = (user = firebaseAuth.currentUser) =>
  new Set(user?.providerData.map(({ providerId }) => providerId) ?? []);

export const observeAuthUser = (listener) => onAuthStateChanged(firebaseAuth, listener);

export const signOutCurrentUser = async () => {
  await authPersistenceReady;
  await signOut(firebaseAuth);
};
