# Data Model: Design Sync & Integration Hub

## Overview
Defines relational entities for synchronization, drift detection, coverage, credentials, notifications, browser sessions, and undo.

## Entities
### component_artifacts
Represents coded UI components.
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | Generated UUID v4 |
| name | text | unique | Human-readable identifier |
| variants | jsonb | not null | Array of variant descriptors |
| last_story_update | timestamptz | nullable | Updated when stories regenerated |
| mapping_status | text | enum('unmapped','mapped','drift') | Current mapping state |
| created_at | timestamptz | default now() |  |
| updated_at | timestamptz | default now() | trigger on write |

### design_artifacts
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| component_id | uuid | FK->component_artifacts(id) |  |
| variant_refs | jsonb | not null | Links to design variants |
| last_design_change_at | timestamptz | not null | Source provided timestamp |
| diff_hash | text | not null | Canonicalized hash for drift comparisons |
| created_at | timestamptz | default now() |  |
| updated_at | timestamptz | default now() |  |

### sync_operations
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| initiated_by | uuid | FK->users(id) | Actor performing sync |
| timestamp | timestamptz | not null |  |
| components_affected | jsonb | not null | Array of component ids |
| direction_modes | jsonb | not null | Per-component direction (code_to_design, design_to_code, bidirectional) |
| diff_summary | jsonb | not null | Counts + details snapshot |
| reversible_until | timestamptz | not null | timestamp + 24h window |
| operation_hash | text | unique | Deterministic hash for idempotency |
| status | text | enum('pending','running','completed','partial','failed') |  |
| duration_ms | int | nullable | Set post completion |

### undo_stack_entries
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| sync_operation_id | uuid | FK->sync_operations(id) |  |
| pre_state_hash | text | not null |  |
| post_state_hash | text | not null |  |
| expiration | timestamptz | not null | 24h cap |
| created_at | timestamptz | default now() |  |
| undone_at | timestamptz | nullable | Set when undone |

### credential_records
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| provider_type | text | enum('notification','design','documentation','testing','ai','analytics') |  |
| status | text | enum('valid','revoked','expired','pending') |  |
| last_validation_time | timestamptz | nullable |  |
| rotation_due | timestamptz | nullable |  |
| metadata | jsonb | not null | Non-secret info (e.g., scopes) |
| created_at | timestamptz | default now() |  |
| updated_at | timestamptz | default now() |  |

### notification_events
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| type | text | enum('sync_completed','drift_detected','coverage_summary','digest','credential_status','browser_test_failure') |  |
| created_at | timestamptz | default now() |  |
| payload_summary | jsonb | not null | Redacted summary |
| channel_targets | jsonb | not null | e.g. channel ids |
| dispatch_status | text | enum('queued','sent','failed','retrying') |  |

### coverage_reports
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| component_id | uuid | FK->component_artifacts(id) |  |
| generated_at | timestamptz | not null |  |
| variant_coverage_pct | numeric | not null | 0-100 |
| missing_variants | jsonb | not null | Array of variant names |
| missing_tests | jsonb | not null | Types of missing tests |
| warnings | jsonb | nullable |  |

### browser_test_sessions
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| story_id | uuid | FK->stories(id) |  |
| start_time | timestamptz | not null |  |
| end_time | timestamptz | nullable |  |
| status | text | enum('running','passed','failed','aborted') |  |
| performance_summary | jsonb | nullable | metrics snapshot |
| correlation_id | uuid | not null | For trace linking |

### drift_queue (optional optimization)
| Field | Type | Constraints | Notes |
| id | uuid | PK |  |
| component_id | uuid | unique | Pending drift evaluation |
| queued_at | timestamptz | not null |  |
| attempt_count | int | not null default 0 |  |
| last_attempt_at | timestamptz | nullable |  |

## Relationships
- component_artifacts 1:N design_artifacts (typically 1:1 but variant mapping allows future multiple representations)
- component_artifacts 1:N coverage_reports (temporal snapshots)
- sync_operations 1:N undo_stack_entries
- component_artifacts M:N sync_operations (via components_affected array; consider join table if query complexity grows)
- stories (external existing table assumed) 1:N browser_test_sessions

## State Transitions
### Sync Operation
pending -> running -> completed | failed
completed -> partial (if some components fail) (represented by status updates)

### Undo Entry
(created) -> (undone_at set) -> expired (expiration < now and undone_at null)

### Credential Record
pending -> valid -> revoked | expired
revoked -> valid (after rotation)
expired -> valid (after rotation)

### Notification Event
queued -> retrying -> sent | failed

### Browser Test Session
running -> passed | failed | aborted

## Indexing Strategy
- component_artifacts(name) unique index for lookup
- design_artifacts(component_id) for joins
- sync_operations(operation_hash) unique for idempotency
- undo_stack_entries(sync_operation_id), expiration partial index for pruning
- credential_records(provider_type, status)
- notification_events(type, created_at desc)
- coverage_reports(component_id, generated_at desc)
- browser_test_sessions(story_id, start_time desc)

## Idempotency Keys
- Sync operation: sha256(sort(componentIds)+timestamp_bucket+direction_modes)
- Coverage report: component_id+variant_hash
- Notification dispatch: event.id ensures single delivery

## Pruning & Maintenance
- Nightly job: remove expired undo_stack_entries; archive old coverage_reports (>30d); clean drift_queue entries with high attempt_count.

## Open Questions (Future)
- Need join table for components_affected if query complexity demands filtering by status per component.
- Consider partitioning notification_events by month if volume grows.

---
*End of data-model.md*
