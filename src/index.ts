#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createTask, updateTask, deleteTask, createTag, getTaskList } from "./utils/task.js";


// 创建 MCP 服务器实例
const server = new Server(
    {
        name: "task-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "create_task",
                description: "创建一个新的任务",
                inputSchema: {
                    type: "object" as const,
                    properties: {
                        userID: {
                            type: "string",
                            description: "用户ID",
                        },
                        title: {
                            type: "string",
                            description: "任务标题",
                        },
                        description: {
                            type: "string",
                            description: "任务描述（可选）",
                        },
                        priority: {
                            type: "number",
                            description: "任务优先级（1-5，默认3）",
                        },
                        endAt: {
                            type: "string",
                            description: "截止时间（ISO 8601格式，可选）",
                        },
                        favorite: {
                            type: "boolean",
                            description: "是否收藏（默认false）",
                        },
                        needTips: {
                            type: "boolean",
                            description: "是否需要提醒（默认false）",
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "标签数组（可选）",
                        },
                    },
                    required: ["userID", "title"],
                },
            },
            {
                name: "get_tasks",
                description: "查询任务列表",
                inputSchema: {
                    type: "object" as const,
                    properties: {
                        userID: {
                            type: "string",
                            description: "用户ID",
                        },
                        status: {
                            type: "string",
                            description: "任务状态（pending/in-progress/completed）",
                        },
                        pageSize: {
                            type: "number",
                            description: "每页数量（默认9）",
                        },
                        pageNum: {
                            type: "number",
                            description: "页码（默认1）",
                        },
                        beginTime: {
                            type: "string",
                            description: "开始时间（ISO 8601格式）",
                        },
                        endTime: {
                            type: "string",
                            description: "结束时间（ISO 8601格式）",
                        },
                        favorite: {
                            type: "boolean",
                            description: "是否只查询收藏的任务",
                        },
                        searchText: {
                            type: "string",
                            description: "搜索文本（匹配标题或描述）",
                        },
                    },
                    required: ["userID"],
                },
            },
            {
                name: "update_task",
                description: "更新任务信息",
                inputSchema: {
                    type: "object" as const,
                    properties: {
                        id: {
                            type: "string",
                            description: "任务ID",
                        },
                        userID: {
                            type: "string",
                            description: "用户ID",
                        },
                        title: {
                            type: "string",
                            description: "任务标题",
                        },
                        description: {
                            type: "string",
                            description: "任务描述",
                        },
                        status: {
                            type: "string",
                            description: "任务状态（pending/in-progress/completed）",
                        },
                        priority: {
                            type: "number",
                            description: "任务优先级（1-5）",
                        },
                        endAt: {
                            type: "string",
                            description: "截止时间（ISO 8601格式）",
                        },
                        favorite: {
                            type: "boolean",
                            description: "是否收藏",
                        },
                        needTips: {
                            type: "boolean",
                            description: "是否需要提醒",
                        },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "标签数组",
                        },
                    },
                    required: ["id", "userID"],
                },
            },
            {
                name: "delete_task",
                description: "删除任务（支持批量删除）",
                inputSchema: {
                    type: "object" as const,
                    properties: {
                        id: {
                            oneOf: [
                                { type: "string" },
                                { type: "array", items: { type: "string" } },
                            ],
                            description: "任务ID或任务ID数组",
                        },
                        userID: {
                            type: "string",
                            description: "用户ID",
                        },
                    },
                    required: ["id", "userID"],
                },
            },
            {
                name: "create_tag",
                description: "创建一个或多个新的标签",
                inputSchema: {
                    type: "object" as const,
                    properties: {
                        userID: {
                            type: "string",
                            description: "用户ID",
                        },
                        tags: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    text: {
                                        type: "string",
                                        description: "标签文本",
                                    },
                                    color: {
                                        type: "string",
                                        description: "标签颜色（如 #FF5733）",
                                    },
                                },
                                required: ["text", "color"],
                            },
                            description: "标签数组，每个标签包含 text 和 color",
                        },
                    },
                    required: ["userID", "tags"],
                },
            },
        ],
    };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            // ============= 创建任务 =============
            case "create_task": {
                const userID = args?.userID as string;
                const taskData = {
                    userID,
                    title: args?.title as string,
                    description: args?.description as string | undefined,
                    priority: args?.priority as number | undefined,
                    endAt: args?.endAt ? new Date(args.endAt as string) : undefined,
                    favorite: args?.favorite as boolean | undefined,
                    needTips: args?.needTips as boolean | undefined,
                    tags: (args?.tags as string[]) || [],
                    createdAt: new Date(),
                };

                const task = await createTask(taskData, userID);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                success: true,
                                message: "任务创建成功",
                                data: task,
                            }),
                        },
                    ],
                };
            }
            // ============= 获取任务列表 =============
            case "get_tasks": {
                const userID = args?.userID as string;
                const tasks = await getTaskList(userID);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                success: true,
                                message: "获取任务列表成功",
                                data: tasks,
                            }),
                        },
                    ],
                };
            }

            // ============= 更新任务 =============
            case "update_task": {
                const userID = args?.userID as string;
                const updateParams = {
                    userID,
                    id: args?.id as string,
                    title: args?.title as string | undefined,
                    description: args?.description as string | undefined,
                    status: args?.status as string | undefined,
                    priority: args?.priority as number | undefined,
                    endAt: args?.endAt ? new Date(args.endAt as string) : undefined,
                    favorite: args?.favorite as boolean | undefined,
                    needTips: args?.needTips as boolean | undefined,
                    tags: args?.tags as string[] | undefined,
                };

                const task = await updateTask(updateParams, userID);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                success: true,
                                message: "任务更新成功",
                                data: task,
                            }),
                        },
                    ],
                };
            }

            // ============= 删除任务 =============
            case "delete_task": {
                const id = args?.id as string | string[];
                const userID = args?.userID as string;

                const result = await deleteTask(id, userID);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                success: true,
                                message: `成功删除 ${result.count} 个任务`,
                                data: result,
                            }),
                        },
                    ],
                };
            }

            // ============= 创建标签 =============
            case "create_tag": {
                const userID = args?.userID as string;
                const tagsInput = args?.tags as Array<{ text: string; color: string }>;

                const tag = await createTag(tagsInput, userID);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify({
                                success: true,
                                message: "标签创建成功",
                                data: tag,
                            }),
                        },
                    ],
                };
            }

            default:
                throw new Error(`未知工具: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        success: false,
                        message: errorMessage,
                        data: null,
                    }),
                },
            ],
            isError: true,
        };
    }
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Task MCP 服务器已启动...");
}

main().catch((error) => {
    console.error("服务器启动失败:", error);
    process.exit(1);
});
