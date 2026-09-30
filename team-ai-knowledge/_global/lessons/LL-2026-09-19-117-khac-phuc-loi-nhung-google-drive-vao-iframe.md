---
id: LL-2026-09-19-117
title: "Khắc phục lỗi nhúng Google Drive vào Iframe"
date: "2026-09-19"
author: AI-Agent
scope: frontend
severity: high
resolution: resolved
tags: [lesson, agent-generated]
---

# LL-2026-09-19-117: Khắc phục lỗi nhúng Google Drive vào Iframe

## Problem
Trình duyệt từ chối hiển thị Google Drive và Google Docs bên trong iframe do chính sách bảo mật X-Frame-Options chặn (Clickjacking protection). Thư mục (Folder) Google Drive hoàn toàn không hiển thị.

## Solution
Sử dụng Javascript Regex để tự động nhận dạng URL. 
- Đối với Thư mục (Folder): Trích xuất ID và chuyển đổi sang định dạng Widget `https://drive.google.com/embeddedfolderview?id=ID#grid`. 
- Đối với file thông thường (Docs, Sheets): Báo cho người dùng biết cần cấp quyền 'Anyone with the link' và cho phép dùng link `/edit` gốc để giữ trải nghiệm sửa tài liệu nếu họ có quyền.