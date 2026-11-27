# KEYFORM — Recorded Audio Sample Sources (`kf01-v2`)

All shipped production audio samples under `public/audio/kf01-v2/` are **CC0 1.0** public-domain recordings verified at the individual recording level prior to promotion from the external Audio V2 listening lab workspace.

- **Inventory:** 18 mono `44.1 kHz`, 16-bit PCM WAV files (`341,600` bytes total).
- **Manifest & checksums:** `public/audio/kf01-v2/manifest.json` and `public/audio/kf01-v2/SHA256SUMS`.
- **Policy:** Recorded samples only; no procedural DSP fallback is shipped in production. Audio is off by default and loads lazily only after an explicit visitor gesture.

## Source Recordings (CC0 1.0)

| Source ID | Author | Licence | Recording | Freesound URL |
| :--- | :--- | :--- | :--- | :--- |
| `handygaber-499773` | handygaber | CC0-1.0 | Corsair K95, Cherry MX Red linear (5 isolated hits) | https://freesound.org/people/handygaber/sounds/499773/ |
| `stavsounds-pack-42151` | StavSounds | CC0-1.0 | Mechanical keyboard tactile one-shots (`766628`–`766632`) | https://freesound.org/people/StavSounds/packs/42151/ |
| `alpinemesh-627647` | alpinemesh | CC0-1.0 | Corsair K70 RGB Enter key (stabilized downstroke) | https://freesound.org/people/alpinemesh/sounds/627647/ |
| `zrrion-665075` | zrrion | CC0-1.0 | Technics board, lubed Gateron Yellow linear (5 hits, **provisional**) | https://freesound.org/people/zrrion/sounds/665075/ |
| `foxfire-570755` | Foxfire- | CC0-1.0 | Cherry MX Brown key release (shared upstroke) | https://freesound.org/people/Foxfire-/sounds/570755/ |
| `sadiquecat-789630` | Sadiquecat | CC0-1.0 | Keychron K10 spacebar, Zoom H2n (shared spacebar) | https://freesound.org/people/Sadiquecat/sounds/789630/ |

Licence text: https://creativecommons.org/publicdomain/zero/1.0/

## Profile Mapping & Documented Limitations

| Switch Profile | Standard Downstroke | Stabilized Downstroke | Release (Upstroke) | Spacebar |
| :--- | :--- | :--- | :--- | :--- |
| **KF—Linear 45** | 5 Cherry MX Red hits (`handygaber-499773`) | Reuses standard downstroke | Shared Cherry MX Brown release (`foxfire-570755`) | Shared Keychron K10 (`sadiquecat-789630`) |
| **KF—Tactile 58** | 5 tactile one-shots (`stavsounds-pack-42151`) | Dedicated Enter recording (`alpinemesh-627647`) | Shared Cherry MX Brown release (`foxfire-570755`) | Shared Keychron K10 (`sadiquecat-789630`) |
| **KF—Silent 50** | 5 lubed Gateron Yellow hits (`zrrion-665075`) — **provisional** | Reuses standard downstroke | Shared Cherry MX Brown release (`foxfire-570755`) | Shared Keychron K10 (`sadiquecat-789630`) |

### Disclosures

1. **Representative previews, not KF—01 measurements:** KEYFORM KF—01 is a fictional mechanical keyboard. These samples are representative acoustic previews derived from CC0 real-world recordings, not recordings of a physical KF—01 unit.
2. **Provisional Silent 50 profile:** No suitable CC0 silent-switch recording was identified; lubed Gateron Yellow linear hits serve as a provisional dampened linear interpretation.
3. **Shared release and spacebar recordings:** A single recorded Cherry MX Brown release and a single Keychron K10 spacebar are shared across all three profiles.
4. **Freesound HQ previews:** Prepared WAVs derive from CC0 Freesound HQ MP3 previews normalized to mono `44.1 kHz` 16-bit PCM with DC removal and `2 ms` / `20 ms` edge fades (no EQ, reverb, compression, or pitch shifting).
