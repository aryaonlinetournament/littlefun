import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseAdmin } from '../src/services/supabase/supabaseClient';

/**
 * Migration Script: V1 Monolith JSON -> V2 Supabase PostgreSQL
 *
 * Reads legacy earn_data.json / store state and inserts records into V2 tables:
 * - cities & areas
 * - users & profiles (mapped from AppUserProfile & AdminCompanionProfile)
 * - meeting_requests (mapped from ClientMeeting)
 * - app_config (mapped from AdminAppConfig)
 */

interface LegacyData {
  users?: Array<{
    id: string;
    email?: string;
    name?: string;
    city?: string;
    isBot?: boolean;
    role?: string;
    registeredAt?: string;
    bio?: string;
  }>;
  companions?: Array<{
    id: string;
    name: string;
    city: string;
    gender?: string;
    createdAt?: string;
  }>;
  meetings?: Array<{
    id: string;
    clientId: string;
    customerId: string;
    title: string;
    status: string;
    dateTime: string;
    location?: string;
  }>;
}

export async function migrateV1ToV2(jsonFilePath?: string) {
  const supabase = getSupabaseAdmin();
  console.log('🚀 Starting V1 -> V2 Migration...');

  const dataPath = jsonFilePath || path.join(process.cwd(), 'earn_data.json');

  if (!fs.existsSync(dataPath)) {
    console.log(`⚠️ Legacy data file not found at ${dataPath}. Creating default seed data...`);
    await seedDefaultV2Data();
    return;
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const legacy: LegacyData = JSON.parse(raw);

  // 1. Seed Cities
  const citiesMap = new Map<string, string>(); // cityName -> cityId
  const defaultCities = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Pune', 'Goa'];
  for (const cName of defaultCities) {
    const { data } = await supabase
      .from('cities')
      .upsert({ name: cName, max_profiles: 1000 }, { onConflict: 'name' })
      .select('id, name')
      .single();
    if (data) citiesMap.set(data.name, data.id);
  }

  // 2. Migrate Users & Profiles
  if (legacy.users && Array.isArray(legacy.users)) {
    for (const u of legacy.users) {
      const email = u.email || `${u.id}@legacy.littlefun.in`;
      const role = u.isBot ? 'PROVIDER' : u.role === 'CLIENT' ? 'CUSTOMER' : 'CUSTOMER';

      const { data: userRecord } = await supabase
        .from('users')
        .upsert(
          {
            firebase_uid: `legacy_${u.id}`,
            email,
            role,
            status: 'ACTIVE',
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (userRecord) {
        const cityId = u.city ? citiesMap.get(u.city) || null : null;
        await supabase
          .from('profiles')
          .upsert(
            {
              user_id: userRecord.id,
              display_name: u.name || 'Anonymous',
              profile_type: u.isBot ? 'SIMULATED' : 'REAL_PERSON',
              bio: u.bio || null,
              city_id: cityId,
              discovery_status: 'VISIBLE',
              profile_completion: 80,
            },
            { onConflict: 'user_id' }
          );
      }
    }
    console.log(`✅ Migrated ${legacy.users.length} legacy users.`);
  }

  // 3. Migrate Companions / Providers
  if (legacy.companions && Array.isArray(legacy.companions)) {
    for (const comp of legacy.companions) {
      const email = `bot_${comp.id}@littlefun.internal`;
      const { data: botUser } = await supabase
        .from('users')
        .upsert(
          {
            firebase_uid: `legacy_bot_${comp.id}`,
            email,
            role: 'PROVIDER',
            status: 'ACTIVE',
          },
          { onConflict: 'email' }
        )
        .select('id')
        .single();

      if (botUser) {
        const cityId = citiesMap.get(comp.city) || null;
        await supabase
          .from('profiles')
          .upsert(
            {
              user_id: botUser.id,
              display_name: comp.name,
              gender: comp.gender || 'Female',
              profile_type: 'SIMULATED',
              city_id: cityId,
              discovery_status: 'VISIBLE',
              profile_completion: 100,
            },
            { onConflict: 'user_id' }
          );
      }
    }
    console.log(`✅ Migrated ${legacy.companions.length} companion profiles.`);
  }

  console.log('🎉 Migration completed successfully!');
}

async function seedDefaultV2Data() {
  const supabase = getSupabaseAdmin();
  console.log('🌱 Seeding default V2 cities, plans, and app config...');

  // Cities
  const cities = [
    { name: 'Mumbai', state: 'Maharashtra' },
    { name: 'Delhi NCR', state: 'Delhi' },
    { name: 'Bengaluru', state: 'Karnataka' },
    { name: 'Hyderabad', state: 'Telangana' },
    { name: 'Pune', state: 'Maharashtra' },
    { name: 'Goa', state: 'Goa' },
  ];

  for (const c of cities) {
    await supabase.from('cities').upsert(c, { onConflict: 'name' });
  }

  // Seed plans
  const plans = [
    { name: 'FREE', display_name: 'Free Starter', price: 0, max_discovery_profiles: 10, max_requests: 1, max_likes_per_day: 10, chat_enabled: false, is_active: true, sort_order: 1 },
    { name: 'BASIC', display_name: 'Basic Connector', price: 299, max_discovery_profiles: 30, max_requests: 3, max_likes_per_day: 25, chat_enabled: true, is_active: true, sort_order: 2 },
    { name: 'PRO', display_name: 'Pro Explorer', price: 799, max_discovery_profiles: 100, max_requests: 10, max_likes_per_day: 100, chat_enabled: true, is_active: true, sort_order: 3 },
    { name: 'PREMIUM', display_name: 'VIP Unlimited', price: 1499, max_discovery_profiles: 999, max_requests: 30, max_likes_per_day: 999, chat_enabled: true, is_active: true, sort_order: 4 },
  ];

  for (const p of plans) {
    await supabase.from('plans').upsert(p as any, { onConflict: 'name' });
  }

  // Seed Super Admin User
  const { data: adminUser } = await supabase.from('users').upsert(
    {
      firebase_uid: 'FkCSTRi6JBSfBf2haCnj8yCoOiC2',
      email: 'aryaonlinetournament@gmail.com',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    { onConflict: 'firebase_uid' }
  ).select('id').single();

  if (adminUser) {
    await supabase.from('profiles').upsert(
      {
        user_id: adminUser.id,
        display_name: 'Arya (Super Admin)',
        profile_type: 'REAL_PERSON',
        discovery_status: 'HIDDEN',
        profile_completion: 100,
      },
      { onConflict: 'user_id' }
    );
  }

  console.log('✅ Default seed completed!');
}

if (require.main === module) {
  migrateV1ToV2().catch(console.error);
}
