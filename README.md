# Tidal Chill

Pixel-art beach sim as an Android live wallpaper, with a home-screen widget that summons events (storm, hurricane, tsunami, volcano, nuke, aliens, meteor, black hole, beach party, glitch).

## Android app (recommended)

Scrolls with your home screen, has its own event widgets, works offline.

1. On the phone, download: https://github.com/Mjons/tidalChill/releases/latest/download/TidalChill.apk
2. Open it, allow "install unknown apps" for your browser when asked.
3. Open Tidal Chill → **Set as wallpaper** → Home screen (or Home + lock).
4. Long-press home screen → Widgets → Tidal Chill → *Tidal events* (4x3 pad) or *Tidal surprise* (1x1).
5. Double-tap the wallpaper for a surprise event.

Scrolling needs a launcher that sends wallpaper scroll info (Nova, Lawnchair, most stock launchers; Samsung may need its wallpaper-scrolling setting or Nova). Every push to `main` builds a new APK into Releases; install over the old one to update.

## Web version (Lively etc.)

## How it works

- `index.html` is the sim. With `?wall` it hides the UI, scales for portrait and turns on chaos mode.
- With `&topic=<name>` it listens to `https://ntfy.sh/<name>` and runs whatever event name gets posted there.
- The widget (HTTP Shortcuts) and `remote.html` just post event names to that topic.

## Setup

1. **Enable Pages:** repo Settings → Pages → Deploy from branch → `main` / `(root)`.
2. **Wallpaper:** install *Lively Wallpapers-With Website* from the Play Store, paste:
   ```
   https://mjons.github.io/tidalChill/?wall&topic=tidalchill-3e26af51d72a
   ```
   Turn on touch/interaction in the app if you want double-tap = surprise event.
3. **Widget:** install *HTTP Shortcuts*, then open this on the phone:
   ```
   https://http-shortcuts.rmy.ch/import?url=https%3A%2F%2Fmjons.github.io%2FtidalChill%2Fshortcuts.json
   ```
   Long-press home screen → Widgets → HTTP Shortcuts → pick "Beach event" (menu) or single events.
4. **Backup remote:** `https://mjons.github.io/tidalChill/remote.html` (works from any device).

## URL params

| param | default | what |
|---|---|---|
| `wall` | off | wallpaper mode |
| `topic` | none | ntfy topic to listen on |
| `chaos` | `6` | avg minutes between random events, `0` = off |
| `toasts` | on | `0` hides event captions |
| `fps` | `30` | frame cap (10-60), lower = less battery |
| `px` | `140` | pixel columns across in portrait, lower = chunkier |

## Commands

Post any of these as the message body to the topic:

`storm` `hurricane` `tsunami` `volcano` `nuke` `alien` `meteor` `blackhole` `party` `glitch` `surprise` `calm` `newsea` `chaos on` `chaos off`

```
curl -d tsunami ntfy.sh/tidalchill-3e26af51d72a
```

The topic is public-ish (anyone who guesses it can trigger your beach). Change it in the URL, `shortcuts.json` and the remote if you care.
