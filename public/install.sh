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
npm run local
