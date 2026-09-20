# Sulphur Sample Shop

A deliberately offline, five-screen Android ecommerce sample for exercising Sulphur's APK review, device-session, streaming, and MCP tooling. It makes no network calls, requests no permissions, and collects no payment data.

Screens: home, collection, product, cart, checkout, and confirmation. Buttons transition between each screen and page/card motion makes streamed agent activity visible.

## Build

From this directory, run `gradlew.bat assembleDebug` (after the wrapper has been generated/downloaded). The expected artifact is `app/build/outputs/apk/debug/app-debug.apk`.
