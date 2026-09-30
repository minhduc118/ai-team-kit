# Design Brief: Inventory Dashboard

## Layout
```
┌──────────┬──────────┬──────────┬──────────┐
│ Giá trị  │  SKU     │ Dưới min │ Sắp HSD  │
├──────────┴──────────┴────┬─────┴──────────┤
│ Nhập/xuất 7 ngày (chart) │ Top 10 sắp hết │
└──────────────────────────┴────────────────┘
```

## Component (Ant Design)
- `Card` + `Statistic` cho KPI
- `Column` chart (grouped: Nhập / Xuất)
- `Table` với `Tag` màu cho mức tồn

## Trạng thái
- Loading: `Skeleton` cho từng card
- Empty: "Chi nhánh chưa có dữ liệu tồn kho"
- Error: `Alert` + nút thử lại

## Màu cảnh báo
- Hết hạn ≤ 7 ngày: đỏ · ≤ 30 ngày: vàng
