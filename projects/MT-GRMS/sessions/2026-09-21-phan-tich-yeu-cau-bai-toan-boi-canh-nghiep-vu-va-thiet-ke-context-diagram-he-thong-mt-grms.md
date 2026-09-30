---
id: SES-2026-09-21-843
date: "2026-09-21"
author: AI-Agent
project: MT-GRMS
goals: ["Đọc và phân tích toàn diện 2 tài liệu đồ án: Report 1 (Project Introduction) và Report 2 (Project Management Plan).","Khảo sát và đặc tả chi tiết yêu cầu bài toán (bối cảnh, pain points, 6 khoảng trống GAP-01 đến GAP-06, 26 tính năng FE-01 đến FE-26) lưu vào file markdown tại thư mục Document.","Thiết kế Sơ đồ ngữ cảnh (Context Diagram / DFD Level 0) cho hệ thống MT-GRMS với đầy đủ các Actor và luồng dữ liệu (Data Flows).","Chuẩn hóa danh sách Actor tiếng Anh và rà soát bối cảnh nghiệp vụ thực tế (mô hình Cô Ngân, FEFO, thanh toán VietQR động, Mini Web Store, AI Recommender).","Làm rõ tương tác Inbound/Outbound giữa các Actor và hệ thống phục vụ vẽ sơ đồ trực quan."]
status: completed
files_changed: ["d:\\FPT_University\\Final\\Grade\\new\\Document\\Yeu_Cau_Bai_Toan_MT_GRMS.md","d:\\FPT_University\\Final\\Grade\\new\\Document\\Context_Diagram_MT_GRMS.md"]
tags: [session, summary]
---

# Session Summary: Phân tích yêu cầu bài toán, bối cảnh nghiệp vụ và thiết kế Context Diagram hệ thống MT-GRMS

Trong phiên làm việc này, các nội dung trọng tâm đã được hoàn thành:
1. Đọc và phân tích sâu sắc nội dung Report 1, Report 2 và file WBS 26 Features:
   - Nghiên cứu case study thực tế cửa hàng Cô Ngân (Yên Bái) với 800 - 1.000 SKU, gánh nặng quản lý thủ công bằng sổ sách/Excel, nghẽn quầy thu ngân giờ cao điểm.
   - Xác định tổn thất tài chính trọng yếu: mất 5% - 8% giá trị tồn kho hàng tháng do thiếu nguyên tắc FEFO (hết hạn trước - xuất trước).
   - Phân tích khoảng trống thị trường (MISA eShop quá cồng kềnh cho hộ kinh doanh, KiotViet chi phí bản quyền định kỳ cao, Excel không có tự động hóa).
2. Xây dựng tài liệu đặc tả toàn diện 'Yeu_Cau_Bai_Toan_MT_GRMS.md' trong thư mục Document:
   - Đặc tả 26 tính năng (FE-01 đến FE-26) phân bổ theo 7 phân hệ chức năng và ánh xạ giải quyết triệt để 6 khoảng trống (GAP-01 đến GAP-06).
   - Xác định yêu cầu phi chức năng (Performance POS < 0.5s, AI timeout 3s + Fallback Redis, Locking chống bán trùng lô FEFO).
   - Ghi nhận 5 phạm vi loại trừ (LI-01 đến LI-05), ma trận RACI và kế hoạch 3 Coding Iterations.
3. Thiết kế Sơ đồ ngữ cảnh hệ thống (Context Diagram - DFD Level 0) lưu tại 'Context_Diagram_MT_GRMS.md':
   - Xây dựng biểu đồ Mermaid thể hiện Process 0 trung tâm kết nối với các thực thể.
   - Chuẩn hóa danh sách Actor bằng tiếng Anh (Store Owner, Cashier, Warehouse Staff, SaaS Master Admin, Customer, Supplier, Banking & Payment Gateway, Generative AI, Shipping Partner, Email Service, POS Hardware Peripherals).
   - Soát lỗi chính tả tiếng Anh trên bản vẽ của team (sửa hardcore -> hardware, skipping -> shipping, servicce -> service, gerenative -> generative).
   - Lập bảng đặc tả chi tiết toàn bộ các luồng tương tác vào (Inbound) và ra (Outbound) kèm nhãn tiếng Anh ngắn gọn để team điền trực tiếp vào sơ đồ draw.io.
4. Tinh chỉnh và chuẩn hóa nội dung Bối cảnh bài toán (Product Background):
   - Viết lại phần bối cảnh theo cả 2 hình thức (tách đoạn phân cấp và bản cô đọng súc tích) bằng cả tiếng Việt và tiếng Anh chuẩn học thuật.
   - Bổ sung trọn vẹn luận điểm mở rộng thị trường: thanh toán VietQR động, quy định thuế/hóa đơn điện tử, kênh bán trực tuyến Mini Web Store (FE-26) và trợ lý AI gợi ý giỏ hàng thông minh (FE-21).