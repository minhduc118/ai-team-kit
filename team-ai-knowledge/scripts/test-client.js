import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

async function testMCP() {
  console.log('🔄 Đang khởi tạo kết nối MCP Client tới Server...');
  
  const serverPath = path.resolve('mcp-server/dist/index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env, KB_ROOT: process.cwd() }
  });

  const client = new Client({ name: 'antigravity-tester', version: '1.0.0' }, { capabilities: {} });
  
  await client.connect(transport);
  console.log('✅ Đã kết nối thành công tới MCP Server!');

  // Test 1: Lấy danh sách tools
  console.log('\n--- TEST 1: Liệt kê các công cụ (Tools) ---');
  const toolsList = await client.listTools();
  console.log(`Tìm thấy ${toolsList.tools.length} tools:`);
  toolsList.tools.forEach(t => console.log(` - ${t.name}: ${t.description}`));

  // Test 2: Gọi thử tool get_overview
  console.log('\n--- TEST 2: Gọi tool get_overview ---');
  const overviewResult = await client.callTool({
    name: 'get_overview',
    arguments: {}
  });
  console.log(overviewResult.content[0].text.substring(0, 300) + '...\n[Nội dung đã được rút gọn]');

  // Test 3: Gọi thử tool search_knowledge
  console.log('\n--- TEST 3: Gọi tool search_knowledge tìm từ khoá "ADR" ---');
  const searchResult = await client.callTool({
    name: 'search_knowledge',
    arguments: { query: 'ADR' }
  });
  console.log(searchResult.content[0].text);

  // Test 4: Gọi thử tool save_session
  console.log('\n--- TEST 4: Gọi tool save_session tạo phiên làm việc mới ---');
  const saveResult = await client.callTool({
    name: 'save_session',
    arguments: {
      projectName: 'team-ai-knowledge',
      title: 'Antigravity Test Session',
      goals: ['Test MCP Server in Antigravity'],
      summary: 'Hệ thống đã nhận lệnh và ghi file thành công qua giao thức MCP.'
    }
  });
  console.log(saveResult.content[0].text);

  process.exit(0);
}

testMCP().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
