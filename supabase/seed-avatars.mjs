// Usage: node supabase/seed-avatars.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV = new URL("../apps/web/.env.local", import.meta.url);
const env = readFileSync(ENV, "utf8");
const read = (key) =>
  (env.match(new RegExp(`^${key}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = read("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const PASSWORD = "KipitaTest123!";

const PEOPLE = [
  ["rider@kipita.test", "women/68"],
  ["driver@kipita.test", "men/32"],
  ["admin@kipita.test", "men/75"],
  ["grace@kipita.test", "women/44"],
  ["peter@kipita.test", "men/46"],
  ["fatuma@kipita.test", "women/26"],
  ["samuel@kipita.test", "men/11"],
  ["mercy@kipita.test", "women/90"],
  ["daniel@kipita.test", "men/64"],
  ["aisha@kipita.test", "women/12"],
  ["brian@kipita.test", "men/85"],
  ["lydia@kipita.test", "women/57"],
  ["joseph@kipita.test", "men/22"],
];

let done = 0;

for (const [email, portrait] of PEOPLE) {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const auth = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (auth.error) {
    console.log(`skip ${email}: ${auth.error.message}`);
    continue;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", auth.data.user.id)
    .maybeSingle();
  if (!profile) {
    console.log(`skip ${email}: no profile row`);
    continue;
  }

  const response = await fetch(`https://randomuser.me/api/portraits/${portrait}.jpg`);
  if (!response.ok) {
    console.log(`skip ${email}: portrait ${response.status}`);
    continue;
  }

  const path = `${profile.id}/portrait.jpg`;
  const upload = await supabase.storage
    .from("avatars")
    .upload(path, Buffer.from(await response.arrayBuffer()), {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (upload.error) {
    console.log(`skip ${email}: upload ${upload.error.message}`);
    continue;
  }

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const patch = await supabase
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", profile.id);
  if (patch.error) {
    console.log(`skip ${email}: update ${patch.error.message}`);
    continue;
  }

  done += 1;
  console.log(`ok   ${email}`);
}

console.log(`\n${done}/${PEOPLE.length} avatars self-hosted in the avatars bucket`);
