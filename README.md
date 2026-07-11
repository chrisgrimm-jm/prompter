# Prompter

A scrolling teleprompter for podcast ad reads — a booth **control** page and an in-room **display**, synced live over Firebase.

## Why it exists
Replaces the old "OBS projector mode + screen-capture a Google Doc" workflow. Paste copy straight from the Google Doc and its **colors and highlights carry over** (red "don't say this" warnings, yellow emphasis, etc.).

## Livestream-safe by design
The display is a plain fullscreen browser window meant for the **in-room monitor** — it is deliberately **not** an OBS source. Because OBS never captures it, there's no scene and no way for the audience to see it on the livestream.

## Pages
- **`control.html`** — open in the booth (or on a phone/laptop). Build a library of reads, put one on the prompter, set speed, play/pause, adjust font/theme.
- **`display.html`** — fullscreen this on the in-room monitor (press **F11**). Use **Copy Display URL** on the control page for the matching session link.
- **`index.html`** — landing page linking to both.

## Script library
Program every sponsor read ahead of the show, then click one to put it on the prompter mid-show:
1. Click **＋ New read**, paste the copy (from the Google Doc), give it a name like *"T-Mobile read"*, and **Save to library**.
2. Repeat for each sponsor. The library persists in Firebase, so it's ready on any device.
3. During the show, click a read in the library — it pops onto the prompter instantly, paused at the top. Hit **▶ Play** when you're ready. The active read is marked **LIVE**.

## How to use
1. Open `control.html`. Click **📺 Copy Display URL**.
2. Open that URL on the in-room monitor and press **F11** for fullscreen.
3. Program your reads (above), click the one you want, then **▶ Play**.

Both pages share a session via a `?topic=` value in the URL, so the Copy Display URL button keeps them matched.

## Controls
Play/pause, scroll speed, scrub, top/end/back/forward, font size, line spacing, side margins, Dark/Light/Amber themes, horizontal mirror (for teleprompter glass — off by default for a plain monitor), vertical flip, and a reading-line guide.

## Sync
State lives in Firebase Realtime Database (shared `pinpoint-abf21` project). Because it's state-based, the display **auto-restores** the current script and settings whenever it loads or reconnects — no resend needed. Under `prompter/{topic}`: `scripts` (the saved library), `content` (what's currently on the prompter), `settings`, and `cmd` (one-shot seek/nudge commands).

---
Jomboy Media · hosted on GitHub Pages
