---
id: CTX-MT-GRMS-001
title: "MT-GRMS — Tổng quan dự án"
date: "2026-09-30"
author: Team Lead
project: MT-GRMS
tags: [context, overview]
---

# MT-GRMS — Multi-Tenant Grocery Retail Management System

Đồ án SEP490 – Group 84 (FPT University, Fall 2026). Tên mã phía code: **SGMS** (Smart Grocery Store Management System).

## Bài toán
Chuỗi cửa hàng tạp hoá nhỏ/vừa quản lý thủ công (sổ sách, Excel) → khó kiểm soát tồn kho, hạn dùng, công nợ nhà cung cấp
và doanh thu theo chi nhánh. Hệ thống SaaS đa tenant: mỗi chủ chuỗi là một tenant, có nhiều cửa hàng/kho.

## Nhóm nghiệp vụ chính
- Sản phẩm, danh mục, đơn vị tính, giá bán.
- Lô hàng + hạn dùng, xuất kho theo **FEFO** (First Expired, First Out).
- Tồn kho, kiểm kê, điều chuyển; hao hụt nội bộ.
- Nhà cung cấp, đơn đặt hàng (PO), nhận hàng.
- Bán hàng POS, thanh toán (VietQR), khách hàng.
- Báo cáo doanh thu, tồn kho, hàng sắp hết hạn.

## Kiến trúc & repo
| Phần | Repo | Công nghệ |
|---|---|---|
| Backend | `SEP490-Repo-Backend` (SGMS.sln) | .NET 8, ASP.NET Core Web API, Clean Architecture, EF Core 8 + SQL Server, JWT, xUnit |
| Frontend | `SEP490-Repo-Frontend` | Vite, React 19, TypeScript, antd v6, TanStack Query, Zustand, Tailwind CSS v4 |
| Knowledge base + quy trình | `team-ai-knowledge` | MCP server "sep", OpenSpec, SEP Kit (6 lệnh /sep-*) |

## Quy trình làm việc
Mọi chức năng đi qua 6 bước SEP (`/sep-spec` → `/sep-archive`), artifact trong `openspec/changes/`,
spec gốc theo capability trong `openspec/specs/`. Bối cảnh kỹ thuật chi tiết cho agent: `openspec/config.yaml`.
Tiến độ và compliance của team: TeamSpec Monitor (`sep490-frontend`, route `/teamspec`).

## Tài liệu liên quan
- Phân tích yêu cầu, context diagram: `projects/MT-GRMS/sessions/`.
- Đánh giá dự án: `projects/MT-GRMS/reviews/`.
