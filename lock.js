const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Grab command line parameters: node prep-usb.js <DriveLetter> "<ClientName>"
const driveLetter = process.argv[2];
const clientName = process.argv[3];

if (!driveLetter || !clientName) {
  console.error("❌ Error: Missing arguments!");
  console.log('\nUsage:  node prep-usb.js <DriveLetter> "<ClientName>"');
  console.log('Example: node prep-usb.js F "Supermarket_Algiers"\n');
  process.exit(1);
}

// Format the drive letter properly (e.g., "E" or "e:" becomes "E:")
const cleanDrive = `${driveLetter.toUpperCase().replace(":", "")}:`;

try {
  console.log(
    `🔍 Accessing physical hardware profile for drive ${cleanDrive}...`,
  );

  // Queries WMI for the exact clean 8-character string (exactly matches the Inno Setup logic)
  const cmdOutput = execSync(
    `wmic logicaldisk where name="${cleanDrive}" get volumeserialnumber`,
    { encoding: "utf8" },
  );

  // Parse out the raw serial number string from the command output line lines
  const lines = cmdOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const usbSerial = lines[1]; // Line 0 is the column header 'VolumeSerialNumber'

  if (
    !usbSerial ||
    usbSerial.toLowerCase() === "volumeserialnumber" ||
    usbSerial.length !== 8
  ) {
    throw new Error(
      `Could not retrieve a valid 8-character serial number for drive ${cleanDrive}. Ensure the drive is plugged in.`,
    );
  }

  console.log(`✅ Verified physical USB Serial ID: ${usbSerial}`);

  // Construct the unactivated payload string
  const licenseContent = `${usbSerial}:UNBOUND`;

  // Set up all target production and backup paths
  const usbLicensePath = path.join(`${cleanDrive}\\`, "license.dat");
  const backupDir = path.join(
    __dirname,
    "nexus-licenses",
    clientName.replace(/[^a-zA-Z0-9_\-]/g, "_"),
  );
  const backupLicensePath = path.join(backupDir, "license_INITIAL.dat");
  const masterLogPath = path.join(
    __dirname,
    "nexus-licenses",
    "master-license-log.json",
  );

  // STEP 1: Flash the license key file straight to the root of the physical USB drive
  fs.writeFileSync(usbLicensePath, licenseContent, "utf8");
  console.log(
    `💾 Successfully flashed license key to USB stick -> ${usbLicensePath}`,
  );

  // STEP 2: Establish the developer backup system for this specific client
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save the initial unactivated text copy
  fs.writeFileSync(backupLicensePath, licenseContent, "utf8");

  // Save human-readable meta details for rapid lookup during support calls
  const infoContent = [
    `Client Identity: ${clientName}`,
    `Allocated USB Serial: ${usbSerial}`,
    `Production Timestamp: ${new Date().toLocaleString()}`,
    `Activation Lifecycle State: UNBOUND (Awaiting First Boot Installation)`,
  ].join("\n");

  fs.writeFileSync(
    path.join(backupDir, "client-info.txt"),
    infoContent,
    "utf8",
  );
  console.log(
    `🗄️  Created local directory snapshot and history card inside: \\nexus-licenses\\${clientName}\\`,
  );

  // STEP 3: Append the metadata records to the global database log file
  let masterLog = [];
  if (fs.existsSync(masterLogPath)) {
    try {
      masterLog = JSON.parse(fs.readFileSync(masterLogPath, "utf8"));
    } catch (e) {
      masterLog = []; // Fallback if file was empty or corrupted
    }
  }

  masterLog.push({
    clientName,
    usbSerial,
    rawLicenseString: licenseContent,
    generatedAt: new Date().toISOString(),
  });

  fs.writeFileSync(masterLogPath, JSON.stringify(masterLog, null, 2), "utf8");
  console.log(
    `📈 Global audit records appended cleanly to master-license-log.json`,
  );

  console.log(
    "\n🎉 Production sequence finished successfully! Move your setup executable onto the drive.",
  );
} catch (error) {
  console.error(
    "\n❌ Operational breakdown preparing USB drive:",
    error.message,
  );
  process.exit(1);
}
