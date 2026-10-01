# Tidal Chill

Pixel-art beach sim as an Android live wallpaper, with a home-screen widget that summons events (storm, hurricane, tsunami, volcano, nuke, aliens, meteor, black hole, beach party, glitch).

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
