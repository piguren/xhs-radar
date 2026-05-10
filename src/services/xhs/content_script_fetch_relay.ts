// T-074+ will fill this in.
export interface ContentScriptFetchResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleContentScriptFetch(_msg: unknown): Promise<ContentScriptFetchResult> {
  return { success: false, error: 'not_implemented' };
}
