import {
  ITEM_MAX,
  pushRecent,
  readItems,
  readRecent,
  removeRecent,
} from './saved-list.ts'

import type { RecentSession, SavedItem } from './saved-list.ts'
import type { FirebaseApp, FirebaseOptions } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore/lite'

export interface CloudUser {
  uid: string
  name: string | null
  photo: string | null
}

export interface HomeDoc {
  items: SavedItem[]
  recent: RecentSession[]
}

export interface Sdk {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  fs: typeof import('firebase/firestore/lite')
  authMod: typeof import('firebase/auth')
}

export interface CloudOptions {
  config: FirebaseOptions
  collection: string
  listField: string
  signedInHint: string
  appCheckSiteKey: string
  recentMax: number
  storage: {
    read: (key: string) => string | null
    write: (key: string, value: string) => void
    forget: (key: string) => void
  }
}

const asCloudUser = (user: User): CloudUser => ({
  uid: user.uid,
  name: user.displayName,
  photo: user.photoURL,
})

const itemEntry = (item: SavedItem) => ({
  name: item.name,
  query: item.query,
  ...(item.id === undefined ? {} : { id: item.id }),
  ...(item.savedAt === undefined ? {} : { savedAt: item.savedAt }),
})

const sessionEntry = (s: RecentSession) => ({
  id: s.id,
  query: s.query,
  at: s.at,
})

async function installAppCheck(app: FirebaseApp, siteKey: string) {
  if (siteKey === '') return
  const mod = await import('firebase/app-check')
  mod.initializeAppCheck(app, {
    provider: new mod.ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export function createCloud(options: CloudOptions) {
  const { config, collection, listField, signedInHint, recentMax, storage } =
    options

  const wasSignedIn = () => storage.read(signedInHint) === '1'

  let sdk: Promise<Sdk> | null = null

  function loadSdk(): Promise<Sdk> {
    if (sdk !== null) return sdk
    const load = (async () => {
      const [appMod, authMod, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore/lite'),
      ])
      const app = appMod.initializeApp(config)
      await installAppCheck(app, options.appCheckSiteKey)
      return {
        app,
        auth: authMod.getAuth(app),
        db: fs.getFirestore(app),
        fs,
        authMod,
      }
    })()
    sdk = load
    load.catch(() => {
      if (sdk === load) sdk = null
    })
    return load
  }

  const warmSignIn = (): void => {
    loadSdk().catch(() => undefined)
  }

  async function watchAuth(
    onUser: (user: CloudUser | null) => void,
  ): Promise<() => void> {
    const { auth, authMod } = await loadSdk()
    return authMod.onAuthStateChanged(auth, user => {
      if (user === null) storage.forget(signedInHint)
      else storage.write(signedInHint, '1')
      onUser(user === null ? null : asCloudUser(user))
    })
  }

  async function signIn(): Promise<CloudUser> {
    const { auth, authMod } = await loadSdk()
    const provider = new authMod.GoogleAuthProvider()
    const result = await authMod.signInWithPopup(auth, provider)
    storage.write(signedInHint, '1')
    return asCloudUser(result.user)
  }

  async function signOut(): Promise<void> {
    const { auth } = await loadSdk()
    storage.forget(signedInHint)
    await auth.signOut()
  }

  async function userDoc(uid: string) {
    const { db, fs } = await loadSdk()
    return { db, fs, ref: fs.doc(db, collection, uid) }
  }

  async function fetchHome(uid: string): Promise<HomeDoc> {
    const { fs, ref } = await userDoc(uid)
    const snap = await fs.getDoc(ref)
    if (!snap.exists()) return { items: [], recent: [] }
    const data = snap.data()
    return {
      items: readItems(data[listField]),
      recent: readRecent(data.recent, recentMax, data.current),
    }
  }

  async function editItems(
    uid: string,
    edit: (items: SavedItem[]) => SavedItem[],
  ): Promise<SavedItem[]> {
    const { db, fs, ref } = await userDoc(uid)
    return fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      const stored = snap.exists() ? readItems(snap.data()[listField]) : []
      const next = edit(stored).slice(0, ITEM_MAX)
      tx.set(ref, { [listField]: next.map(itemEntry) }, { merge: true })
      return next
    })
  }

  async function putSession(
    uid: string,
    entry: RecentSession,
  ): Promise<string[]> {
    const { db, fs, ref } = await userDoc(uid)
    return fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      const data = snap.exists() ? snap.data() : undefined
      const { recent, dropped } = pushRecent(
        readRecent(data?.recent, recentMax, data?.current),
        entry,
        recentMax,
      )
      tx.set(
        ref,
        { recent: recent.map(sessionEntry), current: fs.deleteField() },
        { merge: true },
      )
      return dropped
    })
  }

  async function dropSession(
    uid: string,
    id: string,
  ): Promise<RecentSession[]> {
    const { db, fs, ref } = await userDoc(uid)
    return fs.runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      const data = snap.exists() ? snap.data() : undefined
      const recent = removeRecent(
        readRecent(data?.recent, recentMax, data?.current),
        id,
      )
      tx.set(ref, { recent: recent.map(sessionEntry) }, { merge: true })
      return recent
    })
  }

  return {
    wasSignedIn,
    loadSdk,
    userDoc,
    warmSignIn,
    watchAuth,
    signIn,
    signOut,
    fetchHome,
    editItems,
    putSession,
    dropSession,
  }
}
