import * as admin from 'firebase-admin';
import { config } from '../../config/env';

let app: admin.app.App;

export function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  let credential: admin.credential.Credential;

  if (config.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // JSON string in env var
    const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Path to JSON file
    credential = admin.credential.applicationDefault();
  } else {
    // Application default fallback for project
    credential = admin.credential.applicationDefault();
  }

  app = admin.initializeApp({
    credential,
    projectId: config.FIREBASE_PROJECT_ID,
  });

  console.log(`✅  Firebase Admin initialized (project: ${config.FIREBASE_PROJECT_ID})`);
  return app;
}

export function getFirebaseAdmin(): admin.app.App {
  if (!app) {
    return initFirebase();
  }
  return app;
}

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const firebaseAdmin = getFirebaseAdmin();
  try {
    return await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch (err) {
    if (config.NODE_ENV === 'development') {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          const uid = payload.user_id || payload.sub || payload.uid;
          if (uid) {
            console.log('🔓 [dev mode] Decoded Firebase ID token payload locally for UID:', uid);
            return {
              uid,
              email: payload.email,
              email_verified: payload.email_verified ?? true,
              aud: payload.aud ?? config.FIREBASE_PROJECT_ID,
              auth_time: payload.auth_time || Math.floor(Date.now() / 1000),
              exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
              firebase: payload.firebase || { identities: {}, sign_in_provider: 'password' },
              iat: payload.iat || Math.floor(Date.now() / 1000),
              iss: payload.iss ?? `https://securetoken.google.com/${config.FIREBASE_PROJECT_ID}`,
              sub: uid,
            } as admin.auth.DecodedIdToken;
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse dev JWT token:', parseErr);
      }
    }
    throw err;
  }
}

export async function createFirebaseUser(params: {
  email: string;
  password: string;
  displayName?: string;
  phoneNumber?: string;
}): Promise<admin.auth.UserRecord> {
  const firebaseAdmin = getFirebaseAdmin();
  return firebaseAdmin.auth().createUser(params);
}

export async function sendFcmNotification(params: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<string> {
  const firebaseAdmin = getFirebaseAdmin();
  const message: admin.messaging.Message = {
    token: params.token,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: params.data,
    android: {
      notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
    },
    apns: {
      payload: { aps: { badge: 1 } },
    },
  };
  return firebaseAdmin.messaging().send(message);
}

export async function sendFcmMulticast(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<admin.messaging.BatchResponse> {
  const firebaseAdmin = getFirebaseAdmin();
  const message: admin.messaging.MulticastMessage = {
    tokens: params.tokens,
    notification: { title: params.title, body: params.body },
    data: params.data,
  };
  return firebaseAdmin.messaging().sendEachForMulticast(message);
}
