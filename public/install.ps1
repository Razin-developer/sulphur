param(
  [string]$Directory = "sulphur",
  [string]$Repository = "https://github.com/Razin-developer/sulphur.git",
  [string]$InstallerUrl = "https://sulphur.zydcode.in"
)

$ErrorActionPreference = "Stop"
if (Test-Path -LiteralPath $Directory) { throw "Target directory '$Directory' already exists." }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required. Install Git, then run this command again." }

$securePassword = Read-Host "Sulphur installer password" -AsSecureString
$password = [System.Net.NetworkCredential]::new("", $securePassword).Password
try {
  $payload = @{ password = $password } | ConvertTo-Json -Compress
  $response = Invoke-RestMethod -Method Post -Uri "$InstallerUrl/api/bootstrap-env" -ContentType "application/json" -Body $payload
} finally {
  $password = $null
}

git clone $Repository $Directory
$pushed = $false
try {
  $envPath = Join-Path $Directory ".env"
  [System.IO.File]::WriteAllText($envPath, $response.env, [System.Text.UTF8Encoding]::new($false))
  Push-Location $Directory
  $pushed = $true
  npm run local
} finally {
  if ($pushed) { Pop-Location }
}
