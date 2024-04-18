export async function dynamicImport(specifier: string) {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynamicImport = new Function("specifier", "return import(specifier)");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await dynamicImport(specifier);
}
