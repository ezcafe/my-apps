# Glossary

Project-specific domain terms. Definitions say what something **is**, not how it is built.

**Apple Wallet channel**:
An opt-in notification path that delivers Baby care alerts via an updatable Apple Wallet pass and lock-screen change messages, parallel to Telegram (not a replacement).
_Avoid_: WalletCast product, App Store push, Google Wallet

**Wallet pass subscriber**:
A signed-in user’s issued Apple Wallet pass for a workspace (one serial + auth token per user), which can register one or more devices for updates.
_Avoid_: Telegram link, shared family chat, card subscriber (WalletCast)

**PassKit update loop**:
The Apple flow: device registers → server bumps pass content and subscriber freshness → empty APNs wake → device fetches pass → field `changeMessage` shows on lock screen.
_Avoid_: polling-only updates, app push notification

**Apple enable gate**:
The rule that Apple Wallet subscribe CTAs and issue/update paths run only when required Apple env/certs are complete; otherwise the channel is unavailable (same idea as Telegram enable).
_Avoid_: always-on QR, fake active status

**Wallet latest state**:
The current lock-screen message text for a workspace’s Apple Wallet channel, shared by that workspace’s subscribers until the next care event.
_Avoid_: per-device message, Telegram chat history

**Wallet issue token**:
A short-lived secret in a QR URL that lets another device download the signed-in user’s pass without sharing a session cookie.
_Avoid_: public unauthenticated issue, permanent share link
