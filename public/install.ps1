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
  npm ci

  if (-not $env:STRIPE_WEBHOOK_SECRET) {
    Write-Host ""
    Write-Host "For local Stripe webhooks, open another terminal and run:"
    Write-Host "  stripe listen --forward-to http://localhost:8787/api/billing/stripe/webhook"
    $stripeSecret = Read-Host "Paste the whsec_ webhook signing secret (press Enter to skip Stripe)"
    if ($stripeSecret) {
      $envText = [System.IO.File]::ReadAllText($envPath)
      if ($envText -match '(?m)^STRIPE_WEBHOOK_SECRET=') {
        $envText = [regex]::Replace($envText, '(?m)^STRIPE_WEBHOOK_SECRET=.*$', "STRIPE_WEBHOOK_SECRET=$stripeSecret")
      } else { $envText += "`nSTRIPE_WEBHOOK_SECRET=$stripeSecret`n" }
      [System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))
    }
  }

  $sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
  $adb = Join-Path $sdkRoot "platform-tools\adb.exe"
  $emulator = Join-Path $sdkRoot "emulator\emulator.exe"
  if ((Test-Path $adb) -and (Test-Path $emulator)) {
    & $adb start-server
    $devices = & $adb devices
    if ($devices -notmatch 'emulator-5554\s+(device|offline)') {
      $avd = if ($env:SULPHUR_AVD_NAME) { $env:SULPHUR_AVD_NAME } else { "Sulphur_API_30" }
      Start-Process -FilePath $emulator -ArgumentList "-avd", $avd, "-no-snapshot", "-no-audio", "-no-boot-anim", "-gpu", "host", "-port", "5554"
    }
  } else { Write-Warning "Android SDK/emulator not found. Install Android Studio and create Sulphur_API_30; the web app will still start." }
  npm run local
} finally {
  if ($pushed) { Pop-Location }
}
