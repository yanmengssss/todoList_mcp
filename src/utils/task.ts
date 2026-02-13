import { randomUUID } from "crypto";
import { prisma } from "../DB/mysql.js";
import { CreateTaskType, TaskType } from "./type.js";

const defaultPriority = 3;

// ============= 查询参数类型 =============
export interface GetTaskListParams {
  userID: string;
  status?: string;
  pageSize?: number;
  pageNum?: number;
  beginTime?: string;
  endTime?: string;
  favorite?: boolean;
  searchText?: string;
}

export interface UpdateTaskParams {
  id: string;
  userID: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  endAt?: Date;
  favorite?: boolean;
  needTips?: boolean;
  tags?: Array<string>;
  completedAt?: Date | null;
}
export interface TagType {
  id: string;
  text: string;
  color: string;
}

// 创建标签时的输入类型（不含 id）
export interface TagInputType {
  text: string;
  color: string;
}

// ============= 创建任务 =============
export const createTask = async (task: CreateTaskType, userID: string) => {
  const {
    title,
    description,
    priority,
    endAt,
    favorite,
    tags = [],
    needTips = false,
  } = task;
  const result = await prisma.task.create({
    data: {
      id: randomUUID(),
      userID,
      title,
      description,
      priority: priority || defaultPriority,
      endAt,
      tags,
      favorite,
      needTips,
      status: "pending",
    },
  });
  return result;
};

// ============= 筛选参数类型 =============
export interface GetTaskListFilter {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  favorite?: boolean;
  needTips?: boolean;
  // endAt 时间范围筛选
  endAtStart?: string;
  endAtEnd?: string;
  // completedAt 时间范围筛选
  completedAtStart?: string;
  completedAtEnd?: string;
  // createdAt 时间范围筛选
  createdAtStart?: string;
  createdAtEnd?: string;
}

// 构建时间范围筛选条件
const buildDateFilter = (start?: string, end?: string) => {
  if (!start && !end) return undefined;
  return {
    gte: start ? new Date(start) : undefined,
    lte: end ? new Date(end) : undefined,
  };
};

// ============= 获取任务列表 =============
export const getTaskList = async (
  userID: string,
  filter?: GetTaskListFilter,
) => {
  const result = await prisma.task.findMany({
    where: {
      userID,
      // 标题模糊搜索
      title: filter?.title ? { contains: filter.title } : undefined,
      // 描述模糊搜索
      description: filter?.description
        ? { contains: filter.description }
        : undefined,
      // 状态精确筛选
      status: filter?.status || undefined,
      // 优先级精确筛选
      priority: filter?.priority || undefined,
      // 是否收藏
      favorite: filter?.favorite !== undefined ? filter.favorite : undefined,
      // 是否需要提醒
      needTips: filter?.needTips !== undefined ? filter.needTips : undefined,
      // endAt 时间范围
      endAt: buildDateFilter(filter?.endAtStart, filter?.endAtEnd),
      // completedAt 时间范围
      completedAt: buildDateFilter(
        filter?.completedAtStart,
        filter?.completedAtEnd,
      ),
      // createdAt 时间范围
      createdAt: buildDateFilter(filter?.createdAtStart, filter?.createdAtEnd),
    },
    orderBy: { createdAt: "desc" },
  });
  return result;
};
// ============= 更新任务 =============
export const updateTask = async (params: UpdateTaskParams, userID: string) => {
  const { id, ...updateData } = params;

  // 如果状态变更为完成，自动添加完成时间
  if (updateData.status === "completed" && !updateData.completedAt) {
    updateData.completedAt = new Date();
  }

  // 如果状态从完成变更为其他状态，清除完成时间
  if (updateData.status && updateData.status !== "completed") {
    updateData.completedAt = null;
  }

  const task = await prisma.task.update({
    where: { id, userID },
    data: updateData,
  });

  return task;
};

// ============= 删除任务（支持批量删除） =============
export const deleteTask = async (id: string | string[], userID: string) => {
  const result = await prisma.task.deleteMany({
    where: {
      id: {
        in: Array.isArray(id) ? id : [id],
      },
      userID,
    },
  });
  return result;
};

// 新增标签
export const createTag = async (tags: TagInputType[], userID: string) => {
  // 为每个 tag 生成新的 ID
  const tagsWithIds = tags.map((tag) => ({
    ...tag,
    userID,
    id: randomUUID(),
  }));

  // 创建标签
  const result = await prisma.tags.createMany({
    data: tagsWithIds,
  });

  // 获取新创建的 tag IDs
  const newTagIds = tagsWithIds.map((tag) => tag.id);

  // 获取用户当前的 tags
  const user = await prisma.user.findUnique({
    where: { userID },
    select: { tags: true },
  });

  // 合并现有的 tags 和新的 tag IDs
  const existingTags = (user?.tags as string[]) || [];
  const updatedTags = [...existingTags, ...newTagIds];

  // 更新用户的 tags 字段
  await prisma.user.update({
    where: { userID },
    data: { tags: updatedTags },
  });

  return result;
};
