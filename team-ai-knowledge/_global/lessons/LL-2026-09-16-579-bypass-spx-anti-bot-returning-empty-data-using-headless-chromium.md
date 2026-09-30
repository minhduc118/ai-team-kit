---
id: LL-2026-09-16-579
title: "Bypass SPX Anti-bot returning empty data using Headless Chromium"
date: "2026-09-16"
author: AI-Agent
scope: backend
severity: high
resolution: workaround
tags: [lesson, agent-generated]
---

# LL-2026-09-16-579: Bypass SPX Anti-bot returning empty data using Headless Chromium

## Problem
Gọi trực tiếp API tracking của Shopee Express (SPX) từ server hoặc cURL thường trả về object rỗng `{ data: {} }` thay vì thông báo lỗi do hệ thống anti-bot. Việc này gây khó khăn khi lấy trạng thái tự động miễn phí.

## Solution
Sử dụng thư viện `puppeteer-core` cùng với `@sparticuz/chromium` (để chạy tốt trên Vercel Serverless) để tạo headless browser, render trang web SPX như người thật và bóc tách dữ liệu DOM (Text trạng thái, lịch sử). Sau đó cache kết quả bằng Redis KV để tối ưu tốc độ cho user và gọi qua endpoint Cron. Cần lưu ý set `maxDuration` trong Vercel và chỉ gọi vài đơn mỗi lần cron vì Puppeteer khởi động lâu.