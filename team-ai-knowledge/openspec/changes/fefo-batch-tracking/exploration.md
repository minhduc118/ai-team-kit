# Exploration: FEFO Batch Tracking

## Thuật toán phân bổ
```
remaining = requestedQty
for batch in batches(product, branch)
      where QuantityCurrent > 0 and Status = 'Active' and ExpiryDate >= today
      order by ExpiryDate asc, CreatedAt asc:
    take = min(remaining, batch.QuantityCurrent)
    batch.QuantityCurrent -= take
    insert StockMovement(batch, -take)
    remaining -= take
    if remaining == 0: break
if remaining > 0: reject (không đủ tồn)
```

## Đồng thời (concurrency)
Hai thu ngân bán cùng sản phẩm → dùng `UPDLOCK, ROWLOCK` khi đọc lô trong transaction.

## Sản phẩm không có HSD
`ExpiryDate = NULL` → xếp cuối, fallback FIFO theo `CreatedAt`.
