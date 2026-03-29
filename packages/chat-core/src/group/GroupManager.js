/**
 * 群组管理器
 */
export class GroupManager {
    constructor() {
        this.groups = new Map();
        this.currentGroupId = null;
    }
    /**
     * 创建群组
     */
    createGroup(options) {
        const group = {
            id: options.id,
            name: options.name,
            ownerId: options.ownerId,
            members: [],
            createdAt: Date.now()
        };
        this.groups.set(group.id, group);
        return group;
    }
    /**
     * 获取群组
     */
    getGroup(groupId) {
        return this.groups.get(groupId);
    }
    /**
     * 获取所有群组
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }
    /**
     * 设置当前群组
     */
    setCurrentGroup(groupId) {
        this.currentGroupId = groupId;
    }
    /**
     * 获取当前群组
     */
    getCurrentGroup() {
        if (!this.currentGroupId)
            return undefined;
        return this.groups.get(this.currentGroupId);
    }
    /**
     * 获取当前群组 ID
     */
    getCurrentGroupId() {
        return this.currentGroupId;
    }
    /**
     * 添加成员
     */
    addMember(groupId, user) {
        const group = this.groups.get(groupId);
        if (!group)
            return false;
        // 检查是否已存在
        const exists = group.members.some(m => m.id === user.id);
        if (exists)
            return false;
        group.members.push(user);
        return true;
    }
    /**
     * 移除成员
     */
    removeMember(groupId, userId) {
        const group = this.groups.get(groupId);
        if (!group)
            return false;
        const index = group.members.findIndex(m => m.id === userId);
        if (index === -1)
            return false;
        group.members.splice(index, 1);
        return true;
    }
    /**
     * 获取成员
     */
    getMembers(groupId) {
        const group = this.groups.get(groupId);
        return group?.members || [];
    }
    /**
     * 获取成员 by ID
     */
    getMember(groupId, userId) {
        const group = this.groups.get(groupId);
        return group?.members.find(m => m.id === userId);
    }
    /**
     * 更新成员信息
     */
    updateMember(groupId, userId, updates) {
        const group = this.groups.get(groupId);
        if (!group)
            return false;
        const member = group.members.find(m => m.id === userId);
        if (!member)
            return false;
        Object.assign(member, updates);
        return true;
    }
    /**
     * 更新群组信息
     */
    updateGroup(groupId, updates) {
        const group = this.groups.get(groupId);
        if (!group)
            return undefined;
        Object.assign(group, updates);
        return group;
    }
    /**
     * 删除群组
     */
    deleteGroup(groupId) {
        return this.groups.delete(groupId);
    }
    /**
     * 设置群组成员
     */
    setMembers(groupId, members) {
        const group = this.groups.get(groupId);
        if (!group)
            return false;
        group.members = members;
        return true;
    }
    /**
     * 检查用户是否是群成员
     */
    isMember(groupId, userId) {
        const group = this.groups.get(groupId);
        return group?.members.some(m => m.id === userId) || false;
    }
    /**
     * 检查用户是否是群主
     */
    isOwner(groupId, userId) {
        const group = this.groups.get(groupId);
        return group?.ownerId === userId;
    }
    /**
     * 获取用户所在的群组
     */
    getGroupsByUser(userId) {
        const result = [];
        for (const group of this.groups.values()) {
            if (group.members.some(m => m.id === userId)) {
                result.push(group);
            }
        }
        return result;
    }
}
export default GroupManager;
