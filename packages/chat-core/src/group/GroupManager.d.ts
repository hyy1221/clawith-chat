import { Group, User } from '../types';
/**
 * 群组管理器
 */
export declare class GroupManager {
    private groups;
    private currentGroupId;
    /**
     * 创建群组
     */
    createGroup(options: {
        id: string;
        name: string;
        ownerId: string;
    }): Group;
    /**
     * 获取群组
     */
    getGroup(groupId: string): Group | undefined;
    /**
     * 获取所有群组
     */
    getAllGroups(): Group[];
    /**
     * 设置当前群组
     */
    setCurrentGroup(groupId: string): void;
    /**
     * 获取当前群组
     */
    getCurrentGroup(): Group | undefined;
    /**
     * 获取当前群组 ID
     */
    getCurrentGroupId(): string | null;
    /**
     * 添加成员
     */
    addMember(groupId: string, user: User): boolean;
    /**
     * 移除成员
     */
    removeMember(groupId: string, userId: string): boolean;
    /**
     * 获取成员
     */
    getMembers(groupId: string): User[];
    /**
     * 获取成员 by ID
     */
    getMember(groupId: string, userId: string): User | undefined;
    /**
     * 更新成员信息
     */
    updateMember(groupId: string, userId: string, updates: Partial<User>): boolean;
    /**
     * 更新群组信息
     */
    updateGroup(groupId: string, updates: Partial<Group>): Group | undefined;
    /**
     * 删除群组
     */
    deleteGroup(groupId: string): boolean;
    /**
     * 设置群组成员
     */
    setMembers(groupId: string, members: User[]): boolean;
    /**
     * 检查用户是否是群成员
     */
    isMember(groupId: string, userId: string): boolean;
    /**
     * 检查用户是否是群主
     */
    isOwner(groupId: string, userId: string): boolean;
    /**
     * 获取用户所在的群组
     */
    getGroupsByUser(userId: string): Group[];
}
export default GroupManager;
//# sourceMappingURL=GroupManager.d.ts.map