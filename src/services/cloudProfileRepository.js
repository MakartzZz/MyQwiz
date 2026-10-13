import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../config/firebase.js";
import { createEntryChallenge } from "../domain/entryChallenge.js";
import {
  createUserTag,
  isValidAvatarId,
  normalizeUsername,
} from "../domain/cloudLimits.js";

const PROFILE_CREATION_ATTEMPTS = 8;

const validateProfileInput = ({ username, avatarId }) => {
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 2 || trimmedUsername.length > 32) {
    throw new Error("El nombre de usuario debe tener entre 2 y 32 caracteres.");
  }
  if (!isValidAvatarId(avatarId)) {
    throw new Error("Selecciona una imagen de perfil válida.");
  }
  return {
    username: trimmedUsername,
    normalizedUsername: normalizeUsername(trimmedUsername),
    avatarId,
  };
};

export const createCloudUserProfile = async (firebaseUser, profileInput) => {
  if (!firebaseUser?.uid || !firebaseUser.email) {
    throw new Error("Se necesita una cuenta autenticada con correo para crear el perfil.");
  }
  const profile = validateProfileInput(profileInput);
  const entryChallenge = createEntryChallenge(
    profileInput.entryChallenge?.questionId,
    profileInput.entryChallenge?.answer,
  );

  for (let attempt = 0; attempt < PROFILE_CREATION_ATTEMPTS; attempt += 1) {
    const tag = createUserTag();
    const privateUserRef = doc(firestore, "users", firebaseUser.uid);
    const profileRef = doc(firestore, "profiles", firebaseUser.uid);
    const tagRef = doc(firestore, "userTags", tag);

    const claimed = await runTransaction(firestore, async (transaction) => {
      const [tagSnapshot, existingProfile] = await Promise.all([
        transaction.get(tagRef),
        transaction.get(profileRef),
      ]);
      if (existingProfile.exists()) return existingProfile.data();
      if (tagSnapshot.exists()) return null;

      transaction.set(privateUserRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ownedQuizCount: 0,
        lastQuizMutationId: null,
        entryChallenge,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(profileRef, {
        uid: firebaseUser.uid,
        ...profile,
        tag,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(tagRef, {
        uid: firebaseUser.uid,
        normalizedUsername: profile.normalizedUsername,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { uid: firebaseUser.uid, ...profile, tag };
    });

    if (claimed) return claimed;
  }

  throw new Error("No se pudo generar un tag único. Inténtalo nuevamente.");
};

export const getCloudEntryChallenge = async (userId) => {
  const userSnapshot = await getDoc(doc(firestore, "users", userId));
  return userSnapshot.exists() ? userSnapshot.data().entryChallenge ?? null : null;
};

export const getCloudUserProfile = async (userId) => {
  const profileSnapshot = await getDoc(doc(firestore, "profiles", userId));
  return profileSnapshot.exists() ? profileSnapshot.data() : null;
};

export const updateCloudEntryChallenge = async (userId, challengeInput) => {
  const entryChallenge = createEntryChallenge(
    challengeInput.questionId,
    challengeInput.answer,
  );
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, "users", userId), {
    entryChallenge,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return entryChallenge;
};

export const updateCloudUserProfile = async (userId, currentTag, profileInput) => {
  const profile = validateProfileInput(profileInput);
  const profileRef = doc(firestore, "profiles", userId);
  const tagRef = doc(firestore, "userTags", currentTag);
  const batch = writeBatch(firestore);
  batch.update(profileRef, {
    ...profile,
    updatedAt: serverTimestamp(),
  });
  batch.update(tagRef, {
    normalizedUsername: profile.normalizedUsername,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { uid: userId, ...profile, tag: currentTag };
};

export const findProfileByUsernameAndTag = async (username, tag) => {
  const normalizedTag = tag.trim().replace(/^#/, "").toUpperCase();
  const tagSnapshot = await getDoc(doc(firestore, "userTags", normalizedTag));
  if (!tagSnapshot.exists()) return null;
  if (tagSnapshot.data().normalizedUsername !== normalizeUsername(username)) return null;

  const profileSnapshot = await getDoc(doc(firestore, "profiles", tagSnapshot.data().uid));
  return profileSnapshot.exists() ? profileSnapshot.data() : null;
};
