# Proposal: Cart Checkout Bug

Lỗi tính giá khi coupon percentage + tax amount kết hợp cho kết quả sai.
Reproduce: Add item 100k, apply 10% coupon → tax 10k → expected 81k, got 80k.
