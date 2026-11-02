# Live co-pilot verification — 2026-11-02

Production release: 28d98c0a49c6bfbaa655fd3d0fbdb1c102bfb917 (PR #57).

The panel showed the actual four components, three wires, selected transmitter's 12 mA result and stopped simulation state on the analog example. Removing the PLC-to-coil wire changed its count to two and reported the actual removed wire.

Inspect current sheet offered K1.in ← PLC1.out-0, the unique compatible unused Boolean output. Accept added one wire and displayed the unsaved/autosave-paused notice. One Undo removed it; Redo restored it. Reload then restored the two-wire local project, proving the accepted wire had not been automatically persisted.

After a new preview, moving B1 changed the design. Accept rejected that stale preview with a fresh-review message, and the wire count stayed at two. What does this do? identified B1's actual ADC1.in connection and 12 mA model result. Turning Live co-pilot off removed the active offer and its acceptance control.

The original cloud project was loaded after these checks. It had 14 sheets and was explicitly saved locally again. Test edits were not saved to cloud.

Automated suite: 197 tests passed; production build and PR #57 CI passed. Co-pilot tests cover missing coil/AND inputs, unique-source selection, ambiguity, multiple drivers, change tracking, atomic/stale-preview rejection, typing/drag quiet-time suppression, dismissals and 25-second pacing.

## Boundaries

Later production release 1b181ec17175358b30063a80a17da88003d41b2c (PR #59) was checked for continuous timer observation. On the timed-relay example, disconnecting KT1's output produced no finding at about 0.7 seconds; its real unconnected-output offer was visible at about 33.6 seconds. A fresh check disabled assistance before its first offer, kept it disabled for about 28.8 seconds, then re-enabled it. No finding appeared on immediate inspection about 0.36 seconds later; a fresh delayed offer was observed subsequently. This verifies exclusion of disabled time, not the exact browser threshold. The exact 20-second threshold and connection/removal/sheet/clock resets are covered by regression tests. PR #59 passed 200 tests, build and CI. The original 14-sheet project was restored and saved locally again after the live timer check.

- Production checks used a permanent signed-in account. A separate local preview on 127.0.0.1:5190 was then checked with the account button showing Sign in. The unsigned visitor saved a two-wire baseline, accepted the offered fix to reach three wires, and was denied both local and cloud saving with the permanent-account sign-in message. Reload restored two wires. This verifies unsigned guest saving denial on the local build; anonymous-authenticated and production-origin guest checks remain pending. The GitHub Pages URL redirects to the custom domain and did not isolate a guest session; the user's production session was retained.
- Proactive timing and drag/typing suppression are unit-tested, not yet exhaustively browser-verified.
- Browser checks of timer reconnection/removal/sheet resets, all suggestion combinations, mobile panel layouts and physical power/ground interpretation remain unverified or incomplete.
- Goals and dismissals currently live in the mounted application session and reset on page refresh.
- The co-pilot uses local rules. A secure generative AI service, broad goal-dependent planning and general multi-component completion remain incomplete.
