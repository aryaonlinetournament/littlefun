import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getFirebaseAdmin } from '../src/services/firebase/firebaseAdmin';
import { getSupabaseAdmin } from '../src/services/supabase/supabaseClient';

async function seedSuperAdminAccount() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'aryaonlinetournament@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'arya@admin8527';
  const preferredUid = process.env.SUPER_ADMIN_UID || 'FkCSTRi6JBSfBf2haCnj8yCoOiC2';

  console.log(`🔐 Ensuring Super Admin account (${email}) in Firebase Auth & Supabase DB...`);

  const fbAdmin = getFirebaseAdmin();
  let firebaseUid = preferredUid;

  // 1. Check or Create in Firebase Auth
  try {
    const existingUser = await fbAdmin.auth().getUserByEmail(email);
    console.log(`Found existing Firebase user for ${email} (UID: ${existingUser.uid})`);
    firebaseUid = existingUser.uid;
    // Update password to requested password
    await fbAdmin.auth().updateUser(existingUser.uid, {
      password: password,
      emailVerified: true,
    });
    console.log(`✅ Updated password for ${email} in Firebase Auth.`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      try {
        const newUser = await fbAdmin.auth().createUser({
          uid: preferredUid,
          email: email,
          password: password,
          displayName: 'Arya SuperAdmin',
          emailVerified: true,
        });
        firebaseUid = newUser.uid;
        console.log(`✅ Created new Firebase Auth user for ${email} (UID: ${firebaseUid})`);
      } catch (createErr: any) {
        if (createErr.code === 'auth/uid-already-exists') {
          const userByUid = await fbAdmin.auth().getUser(preferredUid);
          await fbAdmin.auth().updateUser(preferredUid, {
            email: email,
            password: password,
            emailVerified: true,
          });
          firebaseUid = userByUid.uid;
          console.log(`✅ Updated Firebase Auth user by UID ${firebaseUid}.`);
        } else {
          // Create without specifying UID
          const fallbackUser = await fbAdmin.auth().createUser({
            email: email,
            password: password,
            displayName: 'Arya SuperAdmin',
            emailVerified: true,
          });
          firebaseUid = fallbackUser.uid;
          console.log(`✅ Created fallback Firebase Auth user for ${email} (UID: ${firebaseUid})`);
        }
      }
    } else {
      console.warn('Firebase user sync note:', err.message);
    }
  }

  // 2. Ensure Supabase DB user row
  const supabase = getSupabaseAdmin();

  const { data: existingDbUser } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  let dbUserId: string;

  if (existingDbUser) {
    await supabase
      .from('users')
      .update({
        firebase_uid: firebaseUid,
        email: email.toLowerCase(),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      })
      .eq('id', existingDbUser.id);
    dbUserId = existingDbUser.id;
    console.log(`✅ Updated existing Supabase DB user row for ${email} (SUPER_ADMIN).`);
  } else {
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .upsert(
        {
          firebase_uid: firebaseUid,
          email: email.toLowerCase(),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (insertErr || !newUser) {
      const { data: fallbackUser, error: fallErr } = await supabase
        .from('users')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (!fallbackUser) {
        throw new Error(`Supabase DB Error: ${insertErr?.message || fallErr?.message || 'Permission denied'}. Please run table permissions grant in Supabase SQL Editor.`);
      }
      dbUserId = fallbackUser.id;
    } else {
      dbUserId = newUser.id;
    }
    console.log(`✅ Created Supabase DB user row for ${email} (SUPER_ADMIN).`);
  }

  // 3. Ensure profile row
  await supabase.from('profiles').upsert(
    {
      user_id: dbUserId,
      display_name: 'Arya (Super Admin)',
      profile_type: 'REAL_PERSON',
      discovery_status: 'HIDDEN',
      profile_completion: 100,
    },
    { onConflict: 'user_id' }
  );

  console.log('🎉 Super Admin account fully synced!');
}

seedSuperAdminAccount()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to seed Super Admin account:', err);
    process.exit(1);
  });
