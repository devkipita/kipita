import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV = new URL("../apps/web/.env.local", import.meta.url);

function fromEnvFile(key) {
  try {
    const text = readFileSync(ENV, "utf8");
    return (text.match(new RegExp(`^${key}=(.*)$`, "m")) || [])[1]?.trim();
  } catch {
    return undefined;
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  fromEnvFile("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  fromEnvFile("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const PASSWORD = process.env.SEED_PASSWORD ?? "KipitaTest123!";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY, " +
      "or put NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
  );
  process.exit(1);
}

const SKIN = "614335,ae5d29,a55728";
const HAIR = "2c1b18,4a312c";
const BACKGROUND = "2C694D,1E6B4A,174D3B";

const WOMEN_TOPS = "dreads02,bigHair,curly,curvy,bun,hijab,straightAndStrand";
const MEN_TOPS = "shortCurly,shortFlat,dreads01,shortRound,theCaesar";

function portraitUrl(name, gender) {
  const params = new URLSearchParams({
    seed: name,
    size: "400",
    skinColor: SKIN,
    hairColor: HAIR,
    backgroundColor: BACKGROUND,
    eyes: "default,happy",
    mouth: "smile,default",
    top: gender === "f" ? WOMEN_TOPS : MEN_TOPS,
    topProbability: "100",
    accessoriesProbability: "0",
  });

  if (gender === "m") {
    params.set("facialHair", "beardLight,beardMedium,moustacheMagnum");
    params.set("facialHairProbability", "40");
    params.set("facialHairColor", HAIR);
  } else {
    params.set("facialHairProbability", "0");
  }

  return `https://api.dicebear.com/9.x/avataaars/png?${params.toString()}`;
}

const PEOPLE = [
  ["rider@kipita.test", "f"],
  ["driver@kipita.test", "m"],
  ["admin@kipita.test", "m"],
  ["grace@kipita.test", "f"],
  ["peter@kipita.test", "m"],
  ["fatuma@kipita.test", "f"],
  ["samuel@kipita.test", "m"],
  ["mercy@kipita.test", "f"],
  ["daniel@kipita.test", "m"],
  ["aisha@kipita.test", "f"],
  ["brian@kipita.test", "m"],
  ["lydia@kipita.test", "f"],
  ["joseph@kipita.test", "m"],
  ["njeri.rider@kipita.test", "f"],
  ["njeri.admin@kipita.test", "f"],
  ["kevin.rider@kipita.test", "m"],
  ["kevin.admin@kipita.test", "m"],
  ["halima.rider@kipita.test", "f"],
  ["halima.admin@kipita.test", "f"],
  ["brian.rider@kipita.test", "m"],
  ["brian.admin@kipita.test", "m"],
  ["wanjiku.rider@kipita.test", "f"],
  ["wanjiku.admin@kipita.test", "f"],
];

let done = 0;

for (const [email, gender] of PEOPLE) {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const auth = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (auth.error) {
    console.log(`skip ${email}: ${auth.error.message}`);
    continue;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("auth_id", auth.data.user.id)
    .maybeSingle();
  if (!profile) {
    console.log(`skip ${email}: no profile row`);
    continue;
  }

  const response = await fetch(portraitUrl(profile.full_name || email, gender));
  if (!response.ok) {
    console.log(`skip ${email}: portrait ${response.status}`);
    continue;
  }

  const path = `${profile.id}/portrait.png`;
  const upload = await supabase.storage
    .from("avatars")
    .upload(path, Buffer.from(await response.arrayBuffer()), {
      contentType: "image/png",
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
  console.log(`ok   ${email}  ${profile.full_name}`);
}

console.log(`\n${done}/${PEOPLE.length} avatars self-hosted in the avatars bucket`);
