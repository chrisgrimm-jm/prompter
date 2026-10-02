# Prompter Bridge (Google Docs → teleprompter, live)

Pushes a Google Doc straight into the prompter's library in **real time**, so the ad team
can keep editing in Google Docs and the read updates on the prompter almost instantly.

**Why not just paste the Publish-to-web link?** A published Google Doc only re-snapshots
every ~5 minutes, so constant edits lag. This script runs *inside* the Doc, reads the live
text server-side (no CORS, no proxy, no cache), and writes it to the same Firebase library
the Control page already watches live.

## One-time setup (~5 min, per Doc)

1. Open the Google Doc → **Extensions ▸ Apps Script**.
2. Delete whatever's there, paste the contents of **`PrompterBridge.gs`**, click **Save**.
3. Back in the Doc, **reload the page**. A **📣 Prompter** menu appears.
4. **📣 Prompter ▸ Set up…** — enter:
   - **Session**: the value in the prompter Control page's "Session" pill (e.g. `adread`).
   - **Read name**: what it should be called in the library (e.g. `T-Mobile read`).
5. **📣 Prompter ▸ Push to prompter now.** The first time, Google asks you to authorize —
   approve it (it's your own script). The read now shows up in the prompter library.

## Daily use

- Edit the Doc normally. Click **📣 Prompter ▸ Push to prompter now** whenever you want it
  on the prompter instantly.
- Or turn on **📣 Prompter ▸ Auto-push (every 1 min)** and it pushes on its own. (One minute
  is Google's fastest timer; the button is instant.)
- In the booth, the read appears/updates in the **library** live. Click it to put the latest
  version on the prompter (it loads paused at the top, same as any read).

## Notes

- **One script per read/Doc.** Each Doc pushes to its own library entry (keyed by Doc ID),
  so re-pushing updates in place instead of making duplicates.
- Colors & highlights carry over (red "don't say", yellow emphasis, bold, italic, underline).
  Near-black text is dropped so it stays readable on the dark prompter.
- Trim points (Set Start/End) you set in the prompter survive a push.
- The library entry updates live; putting the newest text **on screen** is one click (loading
  a read resets it to the top — intentional, so the host starts clean). Editing a read while
  it's already live on the monitor is not auto-reflected; click it again to reload.
- If a push ever fails with `401`, the Firebase rules changed to require auth — tell Chris and
  we'll add a token. (Today the DB is open, same as the prompter's own writes.)
