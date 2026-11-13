# Changelog

All notable changes to this project are documented in this file.

## 0.0.14-beta

### Fixed

- `cleanAppointments` / `AppointmentProcessorService.processAppointments` no longer drops appointments that follow an ongoing (open-ended) appointment. Before this fix, an appointment with an empty `endDate` caused the next appointment in start-date order to be silently discarded. For example, of two current appointments starting on the same day, only the first was returned, so its `primaryFlag: false` could replace the person's real primary appointment.
- An ongoing appointment now counts as overlapping every later appointment. Merges keep it ongoing, even when a finite appointment is merged into it. Before this fix, the merged `endDate` could be set to the finite appointment's end date.
- When appointments merge, `primaryFlag` is `true` if any merged appointment is primary. Appointments with a different department or job title (after title-code substitutions) are still returned separately.
- Appointments with a missing or invalid `startDate`, or a non-empty invalid `endDate`, are no longer silently dropped. They no longer disturb the ordering and merging of other appointments either. They are returned unmerged after the valid appointments, and a warning is logged.
- The 90-day merge gap is now counted in whole calendar days in UTC. Before this fix, it depended on the host time zone: in zones with daylight saving, such as Europe/Dublin, a gap of exactly 90 days across the October clock change was counted as more than 90 days.

### Action required for downstream consumers

Data previously synced from `cleanAppointments` may be missing appointments or have the wrong primary flag. This affects anyone who has an ongoing appointment followed by another appointment, most often two concurrent current appointments. Downstream integrations that copy `primaryFlag` (for example, the Pure affiliation sync) may have removed a person's primary affiliation. **Rerun the affected synchronisations after upgrading** so that those appointments and primary flags are restored.

## 0.0.13-beta

- Expose department reference lookups (`getDepartmentReference`, `listDepartments`) and add the `tolerateMissingReferenceData` option (#28).
