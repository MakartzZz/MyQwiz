import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../config/firebase.js";
import { getCloudUserProfile } from "./cloudProfileRepository.js";
import {
  isQuizWithinCloudLimits,
  MAX_OWNED_QUIZZES,
  MAX_QUESTIONS_PER_QUIZ,
} from "../domain/cloudLimits.js";

const quizReference = (quizId) => doc(firestore, "quizzes", quizId);
const quizContentReference = (quizId) => doc(firestore, "quizzes", quizId, "content", "current");
const userReference = (userId) => doc(firestore, "users", userId);

const timestampToIso = (value) => (
  typeof value?.toDate === "function" ? value.toDate().toISOString() : value ?? null
);

const mapQuizSummary = (snapshot) => {
  const data = snapshot.data();
  return {
    ...data,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
};

const createQuizSummary = (ownerId, quiz, createdAt) => ({
  id: quiz.id,
  ownerId,
  schemaVersion: quiz.schemaVersion,
  title: quiz.title.trim(),
  description: quiz.description?.trim() ?? "",
  iconId: quiz.iconId,
  questionCount: quiz.questions.length,
  questionTypeCounts: quiz.questions.reduce((counts, question) => ({
    ...counts,
    [question.type]: counts[question.type] + 1,
  }), {
    "multiple-choice": 0,
    "true-false": 0,
    matching: 0,
    "fill-blank": 0,
    "short-answer": 0,
  }),
  preferences: { ...quiz.preferences },
  settings: { ...quiz.settings },
  createdAt,
  updatedAt: serverTimestamp(),
});

const assertQuizCanBeStored = (quiz) => {
  if (!isQuizWithinCloudLimits(quiz)) {
    throw new Error(`Cada quiz puede tener un máximo de ${MAX_QUESTIONS_PER_QUIZ} preguntas.`);
  }
};

export const listOwnedQuizSummaries = async (userId) => {
  const snapshot = await getDocs(query(
    collection(firestore, "quizzes"),
    where("ownerId", "==", userId),
    orderBy("updatedAt", "desc"),
  ));
  return snapshot.docs.map((documentSnapshot) => ({
    ...mapQuizSummary(documentSnapshot),
    questions: null,
    isOwner: true,
    isShared: false,
  }));
};

export const listSharedQuizSummaries = async (userId) => {
  const shareSnapshot = await getDocs(query(
    collection(firestore, "quizShares"),
    where("recipientId", "==", userId),
    where("status", "==", "accepted"),
    orderBy("createdAt", "desc"),
  ));
  const ownerProfilePromises = new Map();
  shareSnapshot.docs.forEach((share) => {
    const ownerId = share.data().ownerId;
    if (!ownerProfilePromises.has(ownerId)) {
      ownerProfilePromises.set(ownerId, getCloudUserProfile(ownerId));
    }
  });

  const summaries = await Promise.all(shareSnapshot.docs.map(async (share) => {
    const [quizSnapshot, ownerProfile] = await Promise.all([
      getDoc(quizReference(share.data().quizId)),
      ownerProfilePromises.get(share.data().ownerId),
    ]);
    return quizSnapshot.exists() ? {
      ...mapQuizSummary(quizSnapshot),
      questions: null,
      isOwner: false,
      isShared: true,
      ownerProfile: ownerProfile ? {
        username: ownerProfile.username,
        tag: ownerProfile.tag,
      } : null,
      shareId: share.id,
      friendshipId: share.data().friendshipId,
    } : null;
  }));
  return summaries.filter(Boolean);
};

export const listPendingQuizInvitations = async (userId) => {
  const shareSnapshot = await getDocs(query(
    collection(firestore, "quizShares"),
    where("recipientId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  ));
  const ownerProfilePromises = new Map();
  shareSnapshot.docs.forEach((share) => {
    const ownerId = share.data().ownerId;
    if (!ownerProfilePromises.has(ownerId)) {
      ownerProfilePromises.set(ownerId, getCloudUserProfile(ownerId));
    }
  });

  const invitations = await Promise.all(shareSnapshot.docs.map(async (share) => {
    const [quizSnapshot, ownerProfile] = await Promise.all([
      getDoc(quizReference(share.data().quizId)),
      ownerProfilePromises.get(share.data().ownerId),
    ]);
    if (!quizSnapshot.exists()) return null;
    return {
      id: share.id,
      ...mapQuizSummary(quizSnapshot),
      ownerProfile: ownerProfile ? {
        username: ownerProfile.username,
        tag: ownerProfile.tag,
        avatarId: ownerProfile.avatarId,
      } : null,
      invitationCreatedAt: timestampToIso(share.data().createdAt),
    };
  }));
  return invitations.filter(Boolean);
};

export const listQuizShareStatuses = async (quizId, ownerId) => {
  const snapshot = await getDocs(query(
    collection(firestore, "quizShares"),
    where("quizId", "==", quizId),
    where("ownerId", "==", ownerId),
  ));
  return Object.fromEntries(snapshot.docs.map((share) => [
    share.data().recipientId,
    // Las comparticiones creadas antes de incorporar la bandeja no tenían estado.
    // Se consideran pendientes para impedir que el propietario intente sobrescribirlas.
    share.data().status ?? "pending",
  ]));
};

export const loadCloudQuiz = async (quizId) => {
  const [summarySnapshot, contentSnapshot] = await Promise.all([
    getDoc(quizReference(quizId)),
    getDoc(quizContentReference(quizId)),
  ]);
  if (!summarySnapshot.exists() || !contentSnapshot.exists()) return null;

  const summary = mapQuizSummary(summarySnapshot);
  return {
    ...summary,
    questions: contentSnapshot.data().questions,
  };
};

export const listQuizProgress = async (userId) => {
  const snapshot = await getDocs(query(
    collection(firestore, "quizProgress"),
    where("userId", "==", userId),
  ));
  return Object.fromEntries(snapshot.docs.map((progressDocument) => {
    const data = progressDocument.data();
    return [data.quizId, {
      attempts: data.attempts,
      bestScore: data.bestScore,
      lastPlayedAt: timestampToIso(data.lastPlayedAt),
    }];
  }));
};

export const saveQuizProgress = async (userId, quizId, stats) => {
  const progressRef = doc(firestore, "quizProgress", `${userId}_${quizId}`);
  await setDoc(progressRef, {
    userId,
    quizId,
    attempts: stats?.attempts ?? 0,
    bestScore: Number.isFinite(stats?.bestScore) ? stats.bestScore : null,
    lastPlayedAt: stats?.lastPlayedAt ? new Date(stats.lastPlayedAt) : null,
    updatedAt: serverTimestamp(),
  });
};

export const recordCloudQuizAttempt = async (userId, quizId, score) => {
  const progressRef = doc(firestore, "quizProgress", `${userId}_${quizId}`);
  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const previous = snapshot.exists() ? snapshot.data() : null;
    const previousBest = Number.isFinite(previous?.bestScore) ? previous.bestScore : null;
    const next = {
      userId,
      quizId,
      attempts: (previous?.attempts ?? 0) + 1,
      bestScore: previousBest === null ? score : Math.max(previousBest, score),
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(progressRef, next);
    return {
      attempts: next.attempts,
      bestScore: next.bestScore,
      lastPlayedAt: new Date().toISOString(),
    };
  });
};

export const createCloudQuiz = async (ownerId, quiz) => {
  assertQuizCanBeStored(quiz);
  const accountRef = userReference(ownerId);
  const summaryRef = quizReference(quiz.id);
  const contentRef = quizContentReference(quiz.id);

  await runTransaction(firestore, async (transaction) => {
    const accountSnapshot = await transaction.get(accountRef);
    if (!accountSnapshot.exists()) throw new Error("El perfil privado del usuario no existe.");

    const ownedQuizCount = accountSnapshot.data().ownedQuizCount ?? 0;
    if (ownedQuizCount >= MAX_OWNED_QUIZZES) {
      throw new Error(`Cada usuario puede tener hasta ${MAX_OWNED_QUIZZES} quizzes propios.`);
    }

    transaction.set(summaryRef, createQuizSummary(ownerId, quiz, serverTimestamp()));
    transaction.set(contentRef, {
      questions: quiz.questions,
      updatedAt: serverTimestamp(),
    });
    transaction.update(accountRef, {
      ownedQuizCount: ownedQuizCount + 1,
      lastQuizMutationId: quiz.id,
      updatedAt: serverTimestamp(),
    });
  });

  return quiz.id;
};

export const syncCloudQuizForSharing = async (ownerId, quiz) => {
  try {
    const summarySnapshot = await getDoc(quizReference(quiz.id));
    if (summarySnapshot.exists()) {
      if (summarySnapshot.data().ownerId !== ownerId) {
        throw new Error("Solo el propietario puede compartir este quiz.");
      }
      await updateCloudQuiz(ownerId, quiz);
      return quiz.id;
    }
  } catch (error) {
    // Las reglas no permiten leer un documento inexistente. En ese caso se crea abajo.
    if (error?.code !== "permission-denied") throw error;
  }

  return createCloudQuiz(ownerId, quiz);
};

export const updateCloudQuiz = async (ownerId, quiz) => {
  assertQuizCanBeStored(quiz);
  const summaryRef = quizReference(quiz.id);
  const currentSnapshot = await getDoc(summaryRef);
  if (!currentSnapshot.exists()) throw new Error("El quiz ya no existe.");
  if (currentSnapshot.data().ownerId !== ownerId) throw new Error("Solo el propietario puede editar este quiz.");

  const batch = writeBatch(firestore);
  batch.set(summaryRef, createQuizSummary(ownerId, quiz, currentSnapshot.data().createdAt));
  batch.set(quizContentReference(quiz.id), {
    questions: quiz.questions,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
};

export const deleteCloudQuiz = async (ownerId, quizId) => {
  const accountRef = userReference(ownerId);
  const summaryRef = quizReference(quizId);
  const contentRef = quizContentReference(quizId);

  await runTransaction(firestore, async (transaction) => {
    const [accountSnapshot, quizSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(summaryRef),
    ]);
    if (!accountSnapshot.exists() || !quizSnapshot.exists()) return;
    if (quizSnapshot.data().ownerId !== ownerId) throw new Error("Solo el propietario puede eliminar este quiz.");

    transaction.delete(contentRef);
    transaction.delete(summaryRef);
    transaction.update(accountRef, {
      ownedQuizCount: Math.max(0, (accountSnapshot.data().ownedQuizCount ?? 1) - 1),
      lastQuizMutationId: quizId,
      updatedAt: serverTimestamp(),
    });
  });

  const shareSnapshot = await getDocs(query(
    collection(firestore, "quizShares"),
    where("quizId", "==", quizId),
    where("ownerId", "==", ownerId),
  ));
  if (!shareSnapshot.empty) {
    const batch = writeBatch(firestore);
    shareSnapshot.docs.forEach((shareDocument) => batch.delete(shareDocument.ref));
    await batch.commit();
  }
};

export const removeReceivedQuiz = (quizId, userId) => (
  deleteDoc(doc(firestore, "quizShares", `${quizId}_${userId}`))
);

export const acceptQuizInvitation = async (shareId, userId) => {
  const shareRef = doc(firestore, "quizShares", shareId);
  const snapshot = await getDoc(shareRef);
  if (!snapshot.exists()) throw new Error("Esta invitación ya no está disponible.");
  const share = snapshot.data();
  if (share.recipientId !== userId || share.status !== "pending") {
    throw new Error("Esta invitación ya fue respondida.");
  }
  await updateDoc(shareRef, {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
};

export const declineQuizInvitation = async (shareId, userId) => {
  const shareRef = doc(firestore, "quizShares", shareId);
  const snapshot = await getDoc(shareRef);
  if (!snapshot.exists()) return;
  if (snapshot.data().recipientId !== userId || snapshot.data().status !== "pending") {
    throw new Error("Esta invitación ya fue respondida.");
  }
  await deleteDoc(shareRef);
};

export const shareQuizWithFriend = async ({ quizId, ownerId, recipientId, friendshipId }) => {
  await setDoc(doc(firestore, "quizShares", `${quizId}_${recipientId}`), {
    quizId,
    ownerId,
    recipientId,
    friendshipId,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const shareQuizWithFriends = async ({ quizId, ownerId, friendships }) => {
  if (!Array.isArray(friendships) || friendships.length === 0) return;

  const shares = friendships.map((friendship) => {
    const recipientId = friendship.friend?.uid;
    if (!recipientId) throw new Error("No pudimos identificar a una de las amistades.");
    return {
      friendshipId: friendship.id,
      recipientId,
      reference: doc(firestore, "quizShares", `${quizId}_${recipientId}`),
    };
  });

  for (let offset = 0; offset < shares.length; offset += 10) {
    const batch = writeBatch(firestore);
    shares.slice(offset, offset + 10).forEach(({ friendshipId, recipientId, reference }) => {
      batch.set(reference, {
        quizId,
        ownerId,
        recipientId,
        friendshipId,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
};
