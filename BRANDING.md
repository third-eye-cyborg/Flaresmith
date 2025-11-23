# Flaresmith Branding & Migration Plan

Date: 2025-11-22
Version: 0.2.0 (full rename applied)

## Summary
The project name has changed from **CloudMake** to **Flaresmith**. Full rename applied across documentation and OpenAPI metadata.

## Scope of Change
| Area | Current | Target | Status |
|------|---------|--------|--------|
| Documentation titles | CloudMake | Flaresmith | Updated ✅ |
| OpenAPI `info.title` | CloudMake Platform API | Flaresmith Platform API | Updated ✅ |
| Package scope (@cloudmake/*) | @cloudmake | @flaresmith | Pending (next phase) |
| Postman collection naming | CloudMake Base - <ProjectName> | Flaresmith Base - <ProjectName> | Pending (update in next collection regen) |
| CI references | CloudMake | Flaresmith | Pending audit |
| Constitution file name | CloudMake Constitution | Flaresmith Constitution | Updated ✅ |

## Transitional Strategy (Phase 1 Complete)
1. Documentation & OpenAPI branding updated.
2. Package scope rename deferred to Phase 2 (will include migration script & optional stub packages).
3. OpenAPI will gain `x-legacy-alias: CloudMake` in Phase 2.
4. Preserve idempotency keys & DB identifiers (non-brand specific).
5. Postman collection naming updated when spec apply regeneration runs.

## Migration Tasks (Remaining)
- [ ] Rename package scopes to `@flaresmith/*`
- [ ] Add OpenAPI `x-legacy-alias`
- [ ] Dual scope release workflow (optional)
- [ ] Update Postman generator naming pattern (FR-029)
- [ ] Run spec apply to refresh collections & MCP descriptors
- [ ] Update analytics events prefix to `flaresmith_*`

## Backwards Compatibility Considerations
| Concern | Mitigation |
|---------|------------|
| Existing imports `@cloudmake/*` | Will receive migration guide + optional stub re-export packages when scope rename occurs |
| External scripts referencing CloudMake | Transitional README note removed; alias extension to be added |
| Postman environment naming | Regenerate collections with new naming; communicate in release notes |

## Communication Plan
- Changelog entry marking branding change Phase 1
- README & CONTRIBUTING updated (removed transitional phrasing)
- OpenAPI version increment will happen in Phase 2 along with alias addition

## OpenAPI Versioning Rationale
Will increment when metadata change (alias + title normalization) is applied; no contract shape changes.

Legacy name references removed from README & CONTRIBUTING; remaining occurrences limited to code import scope until Phase 2.

---
For questions about the migration, open a discussion titled `Branding: Flaresmith Migration`.