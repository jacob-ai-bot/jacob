export async function dynamicImport(specifier: string) {
  const dynamicImport = new Function("specifier", "return import(specifier)");
  return await dynamicImport(specifier);
}
