import bcrypt from "bcryptjs";

const value = process.argv[2];
if (!value) {
  console.error("Usage: node scripts/generate-auth-hash.mjs <plain-text>");
  process.exit(1);
}

const hash = await bcrypt.hash(value, 10);
console.log(hash);
