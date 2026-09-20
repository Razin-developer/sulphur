#!/usr/bin/env bash
set -euo pipefail

directory="${1:-sulphur}"
repository="${SULPHUR_REPOSITORY:-https://github.com/Razin-developer/sulphur.git}"
installer_url="${SULPHUR_INSTALLER_URL:-https://sulphur.zydcode.in}"

command -v git >/dev/null || { echo "Git is required." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required." >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required to safely encode the request." >&2; exit 1; }
[[ ! -e "$directory" ]] || { echo "Target directory '$directory' already exists." >&2; exit 1; }

read -r -s -p "Sulphur installer password: " password
printf '\n'
payload="$(PASSWORD="$password" python3 -c 'import json, os; print(json.dumps({"password": os.environ["PASSWORD"]}))')"
unset password
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
curl --fail --silent --show-error -X POST "$installer_url/api/bootstrap-env" -H "Content-Type: application/json" --data "$payload" | python3 -c 'import json, sys; sys.stdout.write(json.load(sys.stdin)["env"])' > "$env_file"

git clone "$repository" "$directory"
mv "$env_file" "$directory/.env"
trap - EXIT
cd "$directory"
npm ci

printf '\nFor local Stripe webhooks, open another terminal and run:\n  stripe listen --forward-to http://localhost:8787/api/billing/stripe/webhook\n'
read -r -p "Paste the whsec_ webhook signing secret (or press Enter to skip Stripe): " stripe_secret
if [[ -n "$stripe_secret" ]]; then
  STRIPE_SECRET_VALUE="$stripe_secret" node -e '
    const fs = require("fs"); const p = ".env"; let s = fs.readFileSync(p, "utf8");
    const line = `STRIPE_WEBHOOK_SECRET=${process.env.STRIPE_SECRET_VALUE}`;
    s = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(s) ? s.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, line) : `${s}\n${line}\n`;
    fs.writeFileSync(p, s);
  '
fi

sdk_root="${ANDROID_SDK_ROOT:-${HOME:-}/Android/Sdk}"
adb="$sdk_root/platform-tools/adb"
emulator="$sdk_root/emulator/emulator"
if [[ -x "$adb" && -x "$emulator" ]]; then
  "$adb" start-server
  if ! "$adb" devices | grep -q 'emulator-5554[[:space:]]\+\(device\|offline\)'; then
    "$emulator" -avd "${SULPHUR_AVD_NAME:-Sulphur_API_30}" -no-snapshot -no-audio -no-boot-anim -gpu host -port 5554 >/dev/null 2>&1 &
  fi
else
  echo "Android SDK/emulator not found. Install Android Studio and create Sulphur_API_30; the web app will still start." >&2
fi
npm run local
