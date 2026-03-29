/**
 * 生成唯一 ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * 生成消息 ID
 */
export function generateMessageId(): string {
  return generateId('msg')
}

/**
 * 生成群组 ID
 */
export function generateGroupId(): string {
  return generateId('group')
}

/**
 * 生成用户 ID
 */
export function generateUserId(): string {
  return generateId('user')
}

/**
 * 格式化时间
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 1分钟内
  if (diff < 60000) {
    return '刚刚'
  }

  // 1小时内
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }

  // 24小时内
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }

  // 7天内
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }

  // 显示日期
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

/**
 * 格式化日期时间
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 获取文件类型
 */
export function getFileType(filename: string): string {
  const ext = getFileExtension(filename)
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma']
  const docExts = ['doc', 'docx', 'pdf', 'txt', 'md', 'rtf']

  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (docExts.includes(ext)) return 'document'
  return 'file'
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  if (obj instanceof Object) {
    const cloned: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}

/**
 * 判断是否是对象
 */
export function isObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

/**
 * 简单的模板渲染
 */
export function template(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '')
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, ellipsis = '...'): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - ellipsis.length) + ellipsis
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 本地存储工具
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.error('Storage set error:', key)
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },

  clear(): void {
    localStorage.clear()
  }
}
