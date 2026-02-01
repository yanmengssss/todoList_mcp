export interface CreateTaskType {
    userID: string;
    title: string;
    description?: string;
    priority?: number;
    endAt?: Date;
    favorite?: boolean;
    needTips?: boolean;
    tags: Array<string>;
    createdAt: Date;
}

export interface TaskType extends CreateTaskType {
    id: string;
    status: string;
    tags: Array<string>;
    completedAt?: Date | string;
}

export interface TagType {
    id: string;
    text: string;
    color: string;
}
