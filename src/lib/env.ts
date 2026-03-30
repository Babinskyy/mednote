const requiredPublicSupabaseEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function hasSupabaseConfig() {
  return requiredPublicSupabaseEnv.every((key) => Boolean(process.env[key]));
}

export function getSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

export function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIConfig() {
  if (!hasOpenAIConfig()) {
    return null;
  }

  return {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}