import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../config/firebase.js";
import { getCloudUserProfile } from "./cloudProfileRepository.js";

const MAX_VISIBLE_REQUESTS = 30;

const getFriendRequestId = (senderId, recipientId) => `${senderId}_${recipientId}`;

export const getPendingFriendRequests = async (userId) => {
  if (!userId) return [];

  const requestQuery = query(
    collection(firestore, "friendRequests"),
    where("recipientId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(MAX_VISIBLE_REQUESTS),
  );
  const requestSnapshot = await getDocs(requestQuery);

  return Promise.all(requestSnapshot.docs.map(async (requestDocument) => ({
    id: requestDocument.id,
    ...requestDocument.data(),
    sender: await getCloudUserProfile(requestDocument.data().senderId),
  })));
};

export const getFriendships = async (userId) => {
  if (!userId) return [];

  const friendshipQuery = query(
    collection(firestore, "friendships"),
    where("members", "array-contains", userId),
  );
  const friendshipSnapshot = await getDocs(friendshipQuery);

  return Promise.all(friendshipSnapshot.docs.map(async (friendshipDocument) => {
    const friendship = friendshipDocument.data();
    const friendId = friendship.members.find((memberId) => memberId !== userId);
    return {
      id: friendshipDocument.id,
      ...friendship,
      friend: await getCloudUserProfile(friendId),
    };
  }));
};

export const sendFriendRequest = async (senderId, recipientProfile) => {
  if (!senderId || !recipientProfile?.uid) {
    throw new Error("No pudimos identificar a ese usuario.");
  }
  if (senderId === recipientProfile.uid) {
    throw new Error("No puedes enviarte una solicitud a ti mismo.");
  }

  const friendshipRef = doc(
    firestore,
    "friendships",
    [senderId, recipientProfile.uid].sort().join("_"),
  );
  try {
    const friendshipSnapshot = await getDoc(friendshipRef);
    if (friendshipSnapshot.exists()) {
      throw new Error("Esta persona ya está entre tus amistades.");
    }
  } catch (error) {
    // Un documento inexistente no es legible con las reglas actuales.
    if (error?.code !== "permission-denied") throw error;
  }

  const requestRef = doc(
    firestore,
    "friendRequests",
    getFriendRequestId(senderId, recipientProfile.uid),
  );

  let existingRequest = null;
  try {
    existingRequest = await getDoc(requestRef);
  } catch (error) {
    // Las reglas no permiten leer un documento inexistente; la creación sí se valida.
    if (error?.code !== "permission-denied") throw error;
  }

  if (existingRequest?.exists()) {
    const status = existingRequest.data().status;
    if (status === "pending") throw new Error("Ya enviaste una solicitud a esta persona.");
    if (status === "accepted") throw new Error("Esta persona ya está entre tus amistades.");

    await updateDoc(requestRef, {
      status: "pending",
      updatedAt: serverTimestamp(),
    });
    return recipientProfile;
  }

  try {
    await setDoc(requestRef, {
      senderId,
      recipientId: recipientProfile.uid,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error?.code === "permission-denied") {
      throw new Error("La solicitud ya existe o esta persona ya está entre tus amistades.");
    }
    throw error;
  }

  return recipientProfile;
};

export const acceptFriendRequest = async (requestId, userId) => {
  const requestRef = doc(firestore, "friendRequests", requestId);
  const requestSnapshot = await getDoc(requestRef);
  if (!requestSnapshot.exists()) throw new Error("La solicitud ya no está disponible.");

  const friendRequest = requestSnapshot.data();
  if (friendRequest.recipientId !== userId || friendRequest.status !== "pending") {
    throw new Error("La solicitud ya fue respondida.");
  }

  const members = [friendRequest.senderId, friendRequest.recipientId].sort();
  const friendshipRef = doc(firestore, "friendships", members.join("_"));
  const batch = writeBatch(firestore);
  batch.update(requestRef, { status: "accepted", updatedAt: serverTimestamp() });
  batch.set(friendshipRef, {
    members,
    requestId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return {
    id: friendshipRef.id,
    members,
    requestId,
  };
};

export const declineFriendRequest = async (requestId, userId) => {
  const requestRef = doc(firestore, "friendRequests", requestId);
  const requestSnapshot = await getDoc(requestRef);
  if (!requestSnapshot.exists()) throw new Error("La solicitud ya no está disponible.");

  const friendRequest = requestSnapshot.data();
  if (friendRequest.recipientId !== userId || friendRequest.status !== "pending") {
    throw new Error("La solicitud ya fue respondida.");
  }

  await updateDoc(requestRef, { status: "declined", updatedAt: serverTimestamp() });
};

export const removeFriendship = async (friendshipId, userId) => {
  if (!friendshipId || !userId) throw new Error("No pudimos identificar la amistad.");

  const friendshipRef = doc(firestore, "friendships", friendshipId);
  const friendshipSnapshot = await getDoc(friendshipRef);
  if (!friendshipSnapshot.exists()) throw new Error("Esta amistad ya no está disponible.");

  const friendship = friendshipSnapshot.data();
  if (!friendship.members?.includes(userId)) {
    throw new Error("No puedes eliminar esta amistad.");
  }

  const [sentShares, receivedShares] = await Promise.all([
    getDocs(query(
      collection(firestore, "quizShares"),
      where("friendshipId", "==", friendshipId),
      where("ownerId", "==", userId),
    )),
    getDocs(query(
      collection(firestore, "quizShares"),
      where("friendshipId", "==", friendshipId),
      where("recipientId", "==", userId),
    )),
  ]);

  const batch = writeBatch(firestore);
  const sharedDocuments = new Map([
    ...sentShares.docs,
    ...receivedShares.docs,
  ].map((shareDocument) => [shareDocument.id, shareDocument.ref]));
  sharedDocuments.forEach((shareReference) => batch.delete(shareReference));
  batch.delete(friendshipRef);
  if (friendship.requestId) {
    batch.delete(doc(firestore, "friendRequests", friendship.requestId));
  }
  await batch.commit();
};
