import { useSyncExternalStore } from 'react'
import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { signIn as signInToBackend } from '@/backend'

const firebaseConfig = {
  apiKey: 'AIzaSyC5Mk0SoEZf2XHgXt_yJvKS-Rp4YYvW6zA',
  authDomain: 'minigame-platform.firebaseapp.com',
  projectId: 'minigame-platform',
  storageBucket: 'minigame-platform.firebasestorage.app',
  messagingSenderId: '252952015388',
  appId: '1:252952015388:web:2a18d200edead4d43ea5d9',
}

export type AuthSnapshot = {
  user: User | null
  initializing: boolean
}

type StoreListener = () => void
type FirebaseAuthError = {
  code?: string
  message?: string
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const listeners = new Set<StoreListener>()
const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => undefined)

let authSnapshot: AuthSnapshot = {
  user: auth.currentUser,
  initializing: true,
}

let authUnsubscribe: (() => void) | null = null

function emitAuthSnapshot() {
  listeners.forEach((listener) => listener())
}

function updateAuthSnapshot(nextSnapshot: Partial<AuthSnapshot>) {
  authSnapshot = { ...authSnapshot, ...nextSnapshot }
  emitAuthSnapshot()
}

export function getAuthSnapshot() {
  return authSnapshot
}

export function subscribeToAuthStore(listener: StoreListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function useAuthSnapshot() {
  return useSyncExternalStore(subscribeToAuthStore, getAuthSnapshot, getAuthSnapshot)
}

export function startAuthListener() {
  if (authUnsubscribe) {
    return authUnsubscribe
  }

  authUnsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      updateAuthSnapshot({ user, initializing: false })
    },
    () => {
      updateAuthSnapshot({ user: null, initializing: false })
    },
  )

  return () => {
    authUnsubscribe?.()
    authUnsubscribe = null
  }
}

export function subscribeToAuthState(listener: (snapshot: AuthSnapshot) => void) {
  startAuthListener()
  listener(authSnapshot)

  return subscribeToAuthStore(() => {
    listener(authSnapshot)
  })
}

async function syncAuthenticatedUserWithBackend(userCredential: UserCredential) {
  const idToken = await userCredential.user.getIdToken()

  try {
    await signInToBackend(idToken)
  } catch (error) {
    await signOut(auth).catch(() => undefined)
    throw error
  }
}

export async function signInWithEmail(email: string, password: string) {
  await persistenceReady
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  await syncAuthenticatedUserWithBackend(userCredential)

  return userCredential
}

export async function signUpWithEmail(email: string, password: string) {
  await persistenceReady
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await syncAuthenticatedUserWithBackend(userCredential)

  return userCredential
}

export async function signOutUser() {
  await persistenceReady
  await signOut(auth)
}

export async function getIdToken(forceRefresh = false) {
  return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null
}

export async function getAuthHeaders(headers?: HeadersInit) {
  const authHeaders = new Headers(headers)
  const token = await getIdToken()

  if (token) {
    authHeaders.set('Authorization', `Bearer ${token}`)
  }

  return authHeaders
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: await getAuthHeaders(init.headers),
  })
}

export function getAuthErrorMessage(error: unknown) {
  const { code, message } = (error ?? {}) as FirebaseAuthError

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email address is already registered.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/missing-password':
      return 'Enter your password.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return message || 'Something went wrong. Please try again.'
  }
}
