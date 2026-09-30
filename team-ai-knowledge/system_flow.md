# Mô Hình Luồng Hoạt Động — MCP Server Dual-Mode

## 1. Kiến trúc tổng quan

```mermaid
graph TB
    subgraph CLIENTS["🖥️ AI Clients"]
        C1["Cursor"]
        C2["Claude Code"]
        C3["Windsurf"]
        C4["Copilot"]
        C5["Antigravity"]
    end

    subgraph LOCAL["💻 Máy Dev (Local)"]
        STDIO["MCP Server<br/>stdio mode"]
        FS["📁 Filesystem<br/>team-ai-knowledge/"]
    end

    subgraph RENDER["☁️ Render (Remote)"]
        HTTP["MCP Server<br/>HTTP mode<br/>:3100/mcp"]
        CACHE["🧠 In-Memory Cache<br/>TTL: 5 phút"]
    end

    subgraph GITHUB["🐙 GitHub"]
        REPO["Repository<br/>team-ai-knowledge"]
    end

    C1 & C2 & C3 -->|"spawn process<br/>(stdio)"| STDIO
    C4 & C5 -->|"POST /mcp<br/>(HTTP)"| HTTP

    STDIO -->|"fs.read / fs.write"| FS
    FS -->|"git push"| REPO

    HTTP -->|"GitHub Contents API<br/>(đọc + ghi)"| REPO
    HTTP <-->|"cache hit?"| CACHE
```

---

## 2. Luồng ĐỌC dữ liệu (get_overview, search_knowledge, ...)

### Mode A: Local (stdio)

```mermaid
sequenceDiagram
    participant Client as AI Client
    participant MCP as MCP Server (stdio)
    participant FS as Filesystem

    Client->>MCP: CallTool: get_overview
    MCP->>FS: fs.readFileSync("START_HERE.md")
    FS-->>MCP: file content
    MCP->>FS: fs.readFileSync("KNOWLEDGE_MAP.md")
    FS-->>MCP: file content
    MCP-->>Client: { text: "# Overview..." }

    Note over Client,FS: ⚡ ~1-5ms — đọc trực tiếp từ disk
```

### Mode B: Remote (HTTP trên Render)

```mermaid
sequenceDiagram
    participant Client as AI Client
    participant MCP as MCP Server (HTTP)
    participant Cache as In-Memory Cache
    participant GH as GitHub API

    Client->>MCP: POST /mcp → CallTool: get_overview

    MCP->>Cache: cache.get("START_HERE.md")
    alt Cache HIT
        Cache-->>MCP: cached content
        Note over Cache,MCP: ⚡ ~1ms
    else Cache MISS
        MCP->>GH: GET /repos/owner/repo/contents/START_HERE.md
        GH-->>MCP: { content: base64, sha: "abc123" }
        MCP->>MCP: Base64 decode → markdown
        MCP->>Cache: cache.set("START_HERE.md", content, TTL=5min)
    end

    MCP->>Cache: cache.get("KNOWLEDGE_MAP.md")
    Note over Cache: tương tự...

    MCP-->>Client: { text: "# Overview..." }

    Note over Client,GH: 🌐 Cache HIT: ~10ms / Cache MISS: ~200-400ms
```

---

## 3. Luồng GHI dữ liệu (save_session, save_lesson)

### Mode A: Local (stdio)

```mermaid
sequenceDiagram
    participant Client as AI Client
    participant MCP as MCP Server (stdio)
    participant FS as Filesystem

    Client->>MCP: CallTool: save_session
    MCP->>MCP: Generate frontmatter + content
    MCP->>FS: fs.mkdirSync (nếu chưa có)
    MCP->>FS: fs.writeFileSync("projects/x/sessions/2026-09-16-xxx.md")
    FS-->>MCP: OK
    MCP-->>Client: "✅ Session saved to: ..."

    Note over Client,FS: ⚡ ~5ms — ghi trực tiếp
    Note over FS: ⚠️ Dev cần git push thủ công để sync
```

### Mode B: Remote (HTTP trên Render)

```mermaid
sequenceDiagram
    participant Client as AI Client
    participant MCP as MCP Server (HTTP)
    participant Cache as In-Memory Cache
    participant GH as GitHub API

    Client->>MCP: POST /mcp → CallTool: save_session
    MCP->>MCP: Generate frontmatter + content
    MCP->>MCP: Base64 encode content

    MCP->>GH: PUT /repos/owner/repo/contents/projects/x/sessions/2026-09-16-xxx.md
    Note over MCP,GH: Body: { message: "chore: save session", content: base64 }
    GH-->>MCP: 201 Created { sha: "new-sha" }

    MCP->>Cache: Invalidate cache cho folder "projects/x/sessions/"
    MCP-->>Client: "✅ Session saved to: ..."

    Note over Client,GH: 🌐 ~300-600ms — commit trực tiếp vào repo
    Note over GH: ✅ Tự động có trong repo, mọi dev pull là thấy
```

---

## 4. Luồng SEARCH (search_knowledge)

### Vấn đề chính ở Remote mode

Search cần duyệt **tất cả file .md** → trên GitHub sẽ rất tốn API calls nếu không có cache.

```mermaid
sequenceDiagram
    participant MCP as MCP Server (HTTP)
    participant Cache as In-Memory Cache
    participant GH as GitHub API

    Note over MCP: Khi server khởi động (hoặc cache hết hạn)

    MCP->>GH: GET /repos/owner/repo/git/trees/main?recursive=1
    GH-->>MCP: Toàn bộ file tree (1 API call)
    MCP->>MCP: Filter *.md files → danh sách paths

    loop Mỗi file .md (batch)
        MCP->>GH: GET /repos/owner/repo/contents/{path}
        GH-->>MCP: { content: base64 }
        MCP->>Cache: cache.set(path, decoded_content)
    end

    Note over MCP,Cache: 🧠 Cache toàn bộ KB trong memory
    Note over MCP: Sau đó search chạy trên cache — không gọi API nữa
```

### Caching Strategy

```
┌─────────────────────────────────────────────────┐
│              In-Memory Cache                     │
│                                                  │
│  fileTree     │ TTL: 10 phút │ Danh sách files  │
│  fileContent  │ TTL: 5 phút  │ Nội dung từng file│
│  searchIndex  │ TTL: 5 phút  │ Index đã build    │
│                                                  │
│  Invalidate khi: save_session / save_lesson      │
│  Warm-up khi: server khởi động                   │
└─────────────────────────────────────────────────┘
```

---

## 5. Data Provider — Code Architecture

```mermaid
classDiagram
    class DataProvider {
        <<interface>>
        +readFile(path) string
        +writeFile(path, content) void
        +listFiles(dir, pattern) string[]
        +fileExists(path) boolean
    }

    class LocalProvider {
        -kbRoot: string
        +readFile(path) string
        +writeFile(path, content) void
        +listFiles(dir, pattern) string[]
        +fileExists(path) boolean
    }

    class GitHubProvider {
        -owner: string
        -repo: string
        -token: string
        -cache: Map
        +readFile(path) string
        +writeFile(path, content) void
        +listFiles(dir, pattern) string[]
        +fileExists(path) boolean
    }

    DataProvider <|.. LocalProvider : implements
    DataProvider <|.. GitHubProvider : implements

    class ToolHandlers {
        -provider: DataProvider
        +handleGetOverview() string
        +handleSearchKnowledge(query) string
        +handleSaveSession(params) string
    }

    ToolHandlers --> DataProvider : uses
```

---

## 6. Luồng khởi động trên Render

```mermaid
flowchart TD
    A["Render start process"] --> B{"Đọc env vars"}
    B --> C["GITHUB_TOKEN ✓"]
    B --> D["GITHUB_OWNER ✓"]
    B --> E["GITHUB_REPO ✓"]
    B --> F["PORT ✓"]

    C & D & E --> G["Khởi tạo GitHubProvider"]
    G --> H["Warm-up: Tải file tree từ GitHub"]
    H --> I["Warm-up: Tải & cache top files<br/>(START_HERE.md, KNOWLEDGE_MAP.md, ...)"]
    I --> J["Khởi tạo Express + StreamableHTTP"]
    F --> J
    J --> K["✅ Server ready trên PORT"]

    K --> L{"Request đến"}
    L -->|"POST /mcp"| M["Tạo transport mới<br/>(stateless per request)"]
    M --> N["Route tới tool handler"]
    N --> O["Đọc/ghi qua GitHubProvider<br/>(cache-first)"]
    O --> P["Trả response"]
```

---

## 7. Tổng kết hiệu năng

| Thao tác | Local (stdio) | Remote (cache HIT) | Remote (cache MISS) |
|----------|:------------:|:------------------:|:-------------------:|
| `get_overview` | ~3ms | ~10ms | ~400ms |
| `search_knowledge` | ~50ms | ~20ms | ~2-3s (lần đầu) |
| `save_session` | ~5ms | — | ~500ms |
| `save_lesson` | ~5ms | — | ~500ms |
| `list_recent_sessions` | ~30ms | ~15ms | ~1s |

> [!NOTE]
> Sau warm-up, hầu hết requests sẽ hit cache → hiệu năng remote gần bằng local.

---

## 8. Env Variables cần thiết trên Render

| Variable | Mô tả | Ví dụ |
|----------|--------|-------|
| `PORT` | Render tự set | `10000` |
| `GITHUB_TOKEN` | Fine-grained PAT (repo content read/write) | `github_pat_xxx` |
| `GITHUB_OWNER` | GitHub username hoặc org | `your-username` |
| `GITHUB_REPO` | Tên repository | `team-ai-knowledge` |
| `GITHUB_BRANCH` | Branch đọc/ghi (default: main) | `main` |
