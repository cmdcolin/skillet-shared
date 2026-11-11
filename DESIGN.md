# Design rules

How a control in bender and videoskillet says what it is and what state it is
in. The tokens are in `src/tokens.css`; each app's button classes follow these
rules, and the outline button the two share is a `CROSS_REPO_SYNC` region.

## Shape

- Every button has a 1px border and the `--ctl-radius` corner.
- A borderless glyph or word is for marks inside a row that repeat on every row,
  such as a pin, a revert or a row menu.
- `--pill-radius` is for the phone pages only.

## State

- **At rest:** a quiet edge (`--border-quiet`) and `--fg3` text, without a fill.
- **Chosen:** one of several, or an open drawer or view. It takes `--chosen-bg`
  with an `--fg4` edge and `--fg` text.
- **Running:** something sounding, moving or live, such as a switch's `on`, a
  drift or a live MIDI wire. It takes the app's accent. The accent marks nothing
  else.
- **Hover:** it brightens the text and the edge to `--border-hover`. It never
  borrows the chosen or running look.

## Switches

- A two-state switch names both states, such as `on | off`, and lights only the
  `on` side in the accent.
- A glyph whose fill carries the state is not a switch.
