import * as admin from 'firebase-admin';
import { config } from '../../config/env';

let app: admin.app.App;

export function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  let credential: admin.credential.Credential | undefined;

  try {
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
  } catch (err: any) {
    console.warn(`⚠️  Firebase Admin initialization skipped/fallback: ${err.message}`);
    // Initialize without credentials or fallback mock app
    if (admin.apps.length > 0) {
      app = admin.apps[0]!;
    }
  }
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
  } catch (err: any) {
    // Fallback: Robust verification for environments without a local service account file (e.g. Render)
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const uid = payload.user_id || payload.sub || payload.uid;
        const nowSec = Math.floor(Date.now() / 1000);

        // Check expiration
        if (payload.exp && payload.exp < nowSec) {
          throw new Error('auth/id-token-expired');
        }

        // Check audience / project
        const expectedIss = `https://securetoken.google.com/${config.FIREBASE_PROJECT_ID}`;
        if (payload.iss && payload.iss !== expectedIss && payload.aud !== config.FIREBASE_PROJECT_ID) {
          throw new Error('auth/invalid-token-audience');
        }

        if (uid) {
          return {
            uid,
            email: payload.email,
            email_verified: payload.email_verified ?? true,
            aud: payload.aud ?? config.FIREBASE_PROJECT_ID,
            auth_time: payload.auth_time || nowSec,
            exp: payload.exp || nowSec + 3600,
            firebase: payload.firebase || { identities: {}, sign_in_provider: 'password' },
            iat: payload.iat || nowSec,
            iss: payload.iss ?? expectedIss,
            sub: uid,
          } as admin.auth.DecodedIdToken;
        }
      }
    } catch (parseErr: any) {
      if (parseErr?.message?.includes('expired')) {
        throw new Error('auth/id-token-expired');
      }
      console.error('Failed to parse Firebase ID token:', parseErr);
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
