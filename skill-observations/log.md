# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue — resolved statuses always carry their resolution date

---

## 2026-08-29

### Observation 1: Automation handover must verify active publisher and checkout freshness

**Status:** OPEN
**Date:** 2026-08-29
**Session context:** Replacing a cloud editorial routine with a local scheduled routine for a live disaster website.
**Skill:** task-observer
**Type:** internal
**Phase/Area:** Automation handover and deployment safety

**Issue:** The active schedules lived outside the repository while the local checkout was behind production and dirty. A replacement could have silently created two publishers or deployed stale figures.

**Suggested improvement:** Make automation handover start with a schedule inventory, production-versus-checkout comparison, and a paused replacement until the previous publisher is confirmed paused.

**Principle:** Never activate a replacement publisher until the existing publisher and source checkout are both verified safe.

### Observation 2: Shared publisher checkout can change during read-only verification

**Status:** OPEN
**Date:** 2026-08-31
**Session context:** One-minute standby recovery check for a live disaster website.
**Skill:** task-observer
**Type:** internal
**Phase/Area:** Concurrent checkout and publication safety

**Issue:** The designated checkout was initially dirty only in `today.json`, then another publisher changed editorial files and generated assets while this run was reading production and source reports. Without a lock or ownership marker, building or deploying could overwrite or publish an incomplete concurrent update.

**Suggested improvement:** Add an atomic publisher lock or a pre-build ownership check that aborts when tracked or generated files change during source verification; never claim the concurrent files as this run's edits.

**Principle:** A shared publisher checkout must remain stable from initial inspection through deployment, or publication stops.
