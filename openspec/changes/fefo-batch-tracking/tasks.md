# Tasks: fefo-batch-tracking

> ⚠️ Viết tasks khi chưa có design-brief.md và review/skeptic.md — TeamSpec đánh dấu BLOCKED.

## Backend
- [ ] T1 — `IBatchAllocationService.Allocate` phân bổ theo `ExpiryDate` tăng dần, `NULL` xếp cuối (REQ-1, REQ-2)
- [ ] T2 — Bọc phân bổ trong transaction, thiếu tồn → rollback + `409 InsufficientStock` (REQ-3)
- [ ] T3 — Ghi `StockMovements` `SaleOut` cho mỗi lô bị trừ (REQ-4)
- [ ] T4 — Job 00:05 cập nhật `AlertLevel` (REQ-5)

## API
- [ ] T5 — `GET /api/batches`, `GET /api/batches/expiring?days=30`

## Test
- [ ] T6 — Test các Scenario trong specs.md
