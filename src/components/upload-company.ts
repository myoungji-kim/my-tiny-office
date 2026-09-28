export interface Imported {
  readonly companyId: string;
  readonly name: string;
  readonly people: number;
  readonly projects: number;
  readonly foldersToChoose: number;
}

// A company file goes up as the request body; what comes back is the company it became, or why not.
export async function uploadCompany(file: File): Promise<Imported | { readonly error: string }> {
  const response = await fetch("/settings/import", { method: "POST", body: file, headers: { "Content-Type": "application/octet-stream" } });
  return (await response.json()) as Imported | { readonly error: string };
}
