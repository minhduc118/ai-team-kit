# Specs: Cart Checkout Bug Fix

## Fix
Thay đổi thứ tự tính trong `CartService.calculateTotal()`:
```
total = (itemPrice - couponDiscount) + tax(itemPrice)
```
Không phải:
```
total = itemPrice * (1 + taxRate) * (1 - couponPercent)  // WRONG
```

## Test Cases
| Item | Coupon | Tax | Expected |
|------|--------|-----|---------|
| 100k | 10% | 10k | 81k (= 100-10+10% của 90) |
| 200k | 20k flat | 5% | 190k |
