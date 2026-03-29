import { Group, User } from '../types'

/**
 * 群组管理器
 */
export class GroupManager {
  private groups: Map<string, Group> = new Map()
  private currentGroupId: string | null = null

  /**
   * 创建群组
   */
  createGroup(options: { id: string; name: string; ownerId: string }): Group {
    const group: Group = {
      id: options.id,
      name: options.name,
      ownerId: options.ownerId,
      members: [],
      createdAt: Date.now()
    }

    this.groups.set(group.id, group)
    return group
  }

  /**
   * 获取群组
   */
  getGroup(groupId: string): Group | undefined {
    return this.groups.get(groupId)
  }

  /**
   * 获取所有群组
   */
  getAllGroups(): Group[] {
    return Array.from(this.groups.values())
  }

  /**
   * 设置当前群组
   */
  setCurrentGroup(groupId: string): void {
    this.currentGroupId = groupId
  }

  /**
   * 获取当前群组
   */
  getCurrentGroup(): Group | undefined {
    if (!this.currentGroupId) return undefined
    return this.groups.get(this.currentGroupId)
  }

  /**
   * 获取当前群组 ID
   */
  getCurrentGroupId(): string | null {
    return this.currentGroupId
  }

  /**
   * 添加成员
   */
  addMember(groupId: string, user: User): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    // 检查是否已存在
    const exists = group.members.some(m => m.id === user.id)
    if (exists) return false

    group.members.push(user)
    return true
  }

  /**
   * 移除成员
   */
  removeMember(groupId: string, userId: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    const index = group.members.findIndex(m => m.id === userId)
    if (index === -1) return false

    group.members.splice(index, 1)
    return true
  }

  /**
   * 获取成员
   */
  getMembers(groupId: string): User[] {
    const group = this.groups.get(groupId)
    return group?.members || []
  }

  /**
   * 获取成员 by ID
   */
  getMember(groupId: string, userId: string): User | undefined {
    const group = this.groups.get(groupId)
    return group?.members.find(m => m.id === userId)
  }

  /**
   * 更新成员信息
   */
  updateMember(groupId: string, userId: string, updates: Partial<User>): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    const member = group.members.find(m => m.id === userId)
    if (!member) return false

    Object.assign(member, updates)
    return true
  }

  /**
   * 更新群组信息
   */
  updateGroup(groupId: string, updates: Partial<Group>): Group | undefined {
    const group = this.groups.get(groupId)
    if (!group) return undefined

    Object.assign(group, updates)
    return group
  }

  /**
   * 删除群组
   */
  deleteGroup(groupId: string): boolean {
    return this.groups.delete(groupId)
  }

  /**
   * 设置群组成员
   */
  setMembers(groupId: string, members: User[]): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    group.members = members
    return true
  }

  /**
   * 检查用户是否是群成员
   */
  isMember(groupId: string, userId: string): boolean {
    const group = this.groups.get(groupId)
    return group?.members.some(m => m.id === userId) || false
  }

  /**
   * 检查用户是否是群主
   */
  isOwner(groupId: string, userId: string): boolean {
    const group = this.groups.get(groupId)
    return group?.ownerId === userId
  }

  /**
   * 获取用户所在的群组
   */
  getGroupsByUser(userId: string): Group[] {
    const result: Group[] = []
    for (const group of this.groups.values()) {
      if (group.members.some(m => m.id === userId)) {
        result.push(group)
      }
    }
    return result
  }
}

export default GroupManager
