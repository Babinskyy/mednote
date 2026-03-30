"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(config.url, config.anonKey);
  }

  return client;
}