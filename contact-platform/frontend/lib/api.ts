export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    ...init
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "request_failed");
  }
  return data as T;
}

export async function uploadFile(file: File, kind: "logo" | "photo" | "product"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/uploads?kind=${kind}`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "upload_failed");
  return data.url;
}
