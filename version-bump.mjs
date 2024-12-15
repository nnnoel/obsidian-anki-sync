import { readFile, writeFile } from "fs/promises";

async function main() {
  const packageData = JSON.parse(await readFile("package.json", "utf-8"));
  const newVersion = packageData.version;

  const manifestPath = "manifest.json";
  const manifestData = JSON.parse(await readFile(manifestPath, "utf-8"));
  manifestData.version = newVersion;

  await writeFile(
    manifestPath,
    JSON.stringify(manifestData, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Updated ${manifestPath} to version ${newVersion}`);

  const versionsPath = "versions.json";
  let versionsData = {};
  try {
    versionsData = JSON.parse(await readFile(versionsPath, "utf-8"));
  } catch (error) {
    console.warn(`No existing ${versionsPath}, creating a new one.`);
  }

  versionsData[newVersion] = manifestData.minAppVersion;

  await writeFile(
    versionsPath,
    JSON.stringify(versionsData, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Updated ${versionsPath} with new version ${newVersion}`);
}

main().catch((err) => {
  console.error("Error updating versions:", err);
  process.exit(1);
});
