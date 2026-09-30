# Exploration: Cart Checkout Bug

## Root Cause Analysis
Hàm `calculateTotal()` tính coupon trước rồi mới trừ → sai thứ tự.
Correct: price - coupon_amount - tax (on pre-coupon amount).
Hiện tại: price - (coupon% applied on post-tax price).
