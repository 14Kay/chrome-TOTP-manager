import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 拖拽排序状态
 */
interface DragState {
    /** 当前正在拖拽的元素索引 */
    dragIndex: number | null
    /** 当前悬停的目标索引 */
    overIndex: number | null
    /** 是否处于拖拽中 */
    isDragging: boolean
}

/**
 * 注入到每个可拖拽元素上的事件处理器和样式
 */
interface DragItemProps {
    onPointerDown: (e: React.PointerEvent) => void
    style: React.CSSProperties
    className: string
    'data-drag-index': number
}

/**
 * Hook 的返回值
 */
interface UseDragSortReturn<T> {
    /** 当前排列顺序（拖拽过程中实时更新） */
    items: T[]
    /** 获取某个索引处元素的拖拽 props */
    getDragItemProps: (index: number) => DragItemProps
    /** 当前拖拽状态 */
    dragState: DragState
}

// 长按触发时间（毫秒）
const LONG_PRESS_DELAY = 400
// 拖拽激活的最小移动距离（像素），在长按未触发前如果移动超过此距离则取消
const MOVE_THRESHOLD = 5

/**
 * 长按拖拽排序 Hook
 * 通过 Pointer 事件实现长按 -> 拖拽 -> 排序 -> 持久化
 */
export function useDragSort<T>(
    sourceItems: T[],
    onReorder: (items: T[]) => void,
    enabled: boolean = true
): UseDragSortReturn<T> {
    const [items, setItems] = useState<T[]>(sourceItems)
    const [dragState, setDragState] = useState<DragState>({
        dragIndex: null,
        overIndex: null,
        isDragging: false,
    })

    // 用 ref 跟踪内部可变状态，避免闭包问题
    const stateRef = useRef({
        longPressTimer: null as ReturnType<typeof setTimeout> | null,
        isDragging: false,
        dragIndex: -1,
        startY: 0,
        currentY: 0,
        itemElements: [] as HTMLElement[],
        itemRects: [] as DOMRect[],
        ghostEl: null as HTMLElement | null,
        containerEl: null as HTMLElement | null,
        currentOverIndex: -1,
        dragOffsetY: 0,
    })

    // 同步外部数据源
    useEffect(() => {
        if (!stateRef.current.isDragging) {
            setItems(sourceItems)
        }
    }, [sourceItems])

    /**
     * 创建浮动的拖拽幽灵元素
     */
    const createGhost = useCallback((sourceEl: HTMLElement, clientY: number) => {
        const rect = sourceEl.getBoundingClientRect()
        const ghost = sourceEl.cloneNode(true) as HTMLElement
        ghost.className = sourceEl.className + ' drag-ghost'
        ghost.style.position = 'fixed'
        ghost.style.left = `${rect.left}px`
        ghost.style.top = `${rect.top}px`
        ghost.style.width = `${rect.width}px`
        ghost.style.height = `${rect.height}px`
        ghost.style.zIndex = '9999'
        ghost.style.pointerEvents = 'none'
        ghost.style.transition = 'box-shadow 0.2s, transform 0.2s'
        ghost.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)'
        ghost.style.transform = 'scale(1.03)'
        ghost.style.borderRadius = '8px'
        ghost.style.opacity = '0.95'
        document.body.appendChild(ghost)

        stateRef.current.ghostEl = ghost
        stateRef.current.dragOffsetY = clientY - rect.top
        return ghost
    }, [])

    /**
     * 移除幽灵元素
     */
    const removeGhost = useCallback(() => {
        if (stateRef.current.ghostEl) {
            stateRef.current.ghostEl.remove()
            stateRef.current.ghostEl = null
        }
    }, [])

    /**
     * 收集所有拖拽项目的 DOM 元素和位置
     */
    const collectItemRects = useCallback(() => {
        const container = stateRef.current.containerEl
        if (!container) return
        const elements = Array.from(
            container.querySelectorAll<HTMLElement>('[data-drag-index]')
        )
        stateRef.current.itemElements = elements
        stateRef.current.itemRects = elements.map(el => el.getBoundingClientRect())
    }, [])

    /**
     * 根据当前 Y 位置计算目标索引
     */
    const getOverIndex = useCallback((clientY: number): number => {
        const rects = stateRef.current.itemRects
        const dragIdx = stateRef.current.dragIndex

        for (let i = 0; i < rects.length; i++) {
            if (i === dragIdx) continue
            const rect = rects[i]
            const midY = rect.top + rect.height / 2
            if (clientY < midY) {
                return i
            }
        }
        return rects.length - 1
    }, [])

    /**
     * 执行数组重新排序
     */
    const reorderItems = useCallback((arr: T[], fromIndex: number, toIndex: number): T[] => {
        const result = [...arr]
        const [moved] = result.splice(fromIndex, 1)
        result.splice(toIndex, 0, moved)
        return result
    }, [])

    /**
     * Pointer Move 全局处理
     */
    const handlePointerMove = useCallback((e: PointerEvent) => {
        const state = stateRef.current

        // 长按等待阶段：如果移动过大则取消
        if (state.longPressTimer && !state.isDragging) {
            const dy = Math.abs(e.clientY - state.startY)
            const dx = Math.abs(e.clientX - state.startY) // 简化：只检查 Y 方向
            if (dy > MOVE_THRESHOLD || dx > MOVE_THRESHOLD) {
                clearTimeout(state.longPressTimer)
                state.longPressTimer = null
            }
            return
        }

        if (!state.isDragging || !state.ghostEl) return

        e.preventDefault()
        state.currentY = e.clientY

        // 更新幽灵元素位置
        state.ghostEl.style.top = `${e.clientY - state.dragOffsetY}px`

        // 计算当前悬停位置
        const overIndex = getOverIndex(e.clientY)
        if (overIndex !== state.currentOverIndex) {
            state.currentOverIndex = overIndex
            setDragState(prev => ({ ...prev, overIndex }))

            // 对非拖拽元素应用 CSS 位移
            const dragIdx = state.dragIndex
            const dragRect = state.itemRects[dragIdx]
            if (!dragRect) return
            const itemHeight = dragRect.height + 12 // card 间距 space-y-3 = 12px

            state.itemElements.forEach((el, i) => {
                if (i === dragIdx) return
                let shift = 0
                if (dragIdx < overIndex) {
                    // 向上拖：dragIdx 和 overIndex 之间的元素向上移动
                    if (i > dragIdx && i <= overIndex) {
                        shift = -itemHeight
                    }
                } else {
                    // 向下拖：overIndex 和 dragIdx 之间的元素向下移动
                    if (i >= overIndex && i < dragIdx) {
                        shift = itemHeight
                    }
                }
                el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)'
                el.style.transform = shift !== 0 ? `translateY(${shift}px)` : ''
            })
        }
    }, [getOverIndex])

    /**
     * Pointer Up 全局处理
     */
    const handlePointerUp = useCallback(() => {
        const state = stateRef.current

        // 取消长按计时器
        if (state.longPressTimer) {
            clearTimeout(state.longPressTimer)
            state.longPressTimer = null
        }

        if (state.isDragging) {
            const fromIndex = state.dragIndex
            const toIndex = state.currentOverIndex

            // 清除所有元素的位移样式
            state.itemElements.forEach(el => {
                el.style.transition = ''
                el.style.transform = ''
            })

            // 移除幽灵和拖拽源的样式
            removeGhost()

            // 还原拖拽源元素的可见性
            const sourceEl = state.itemElements[fromIndex]
            if (sourceEl) {
                sourceEl.style.opacity = ''
                sourceEl.style.visibility = ''
            }

            // 执行排序并持久化
            if (fromIndex !== toIndex && toIndex >= 0) {
                setItems(prev => {
                    const newItems = reorderItems(prev, fromIndex, toIndex)
                    onReorder(newItems)
                    return newItems
                })
            }

            state.isDragging = false
            state.dragIndex = -1
            state.currentOverIndex = -1

            // 恢复 body 样式
            document.body.style.overflow = ''
            document.body.style.userSelect = ''

            setDragState({
                dragIndex: null,
                overIndex: null,
                isDragging: false,
            })
        }

        // 移除全局事件监听器
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
    }, [handlePointerMove, removeGhost, reorderItems, onReorder])

    /**
     * 为每个可拖拽元素生成 props
     */
    const getDragItemProps = useCallback((index: number): DragItemProps => {
        const onPointerDown = (e: React.PointerEvent) => {
            if (!enabled) return
            // 只响应主按钮（左键/触摸）
            if (e.button !== 0) return
            // 防止事件冲突
            e.stopPropagation()

            const target = e.currentTarget as HTMLElement
            const state = stateRef.current

            state.startY = e.clientY
            state.dragIndex = index
            state.containerEl = target.parentElement

            // 注册全局事件
            document.addEventListener('pointermove', handlePointerMove)
            document.addEventListener('pointerup', handlePointerUp)

            // 启动长按计时器
            state.longPressTimer = setTimeout(() => {
                state.longPressTimer = null
                state.isDragging = true
                state.currentOverIndex = index

                // 收集卡片位置信息
                collectItemRects()

                // 创建浮动幽灵
                createGhost(target, e.clientY)

                // 隐藏原始元素
                target.style.opacity = '0'
                target.style.visibility = 'hidden'

                // 防止触摸设备上的页面滚动
                document.body.style.overflow = 'hidden'
                // 防止触摸设备上的文本选择
                document.body.style.userSelect = 'none'

                // 触发震动反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50)
                }

                setDragState({
                    dragIndex: index,
                    overIndex: index,
                    isDragging: true,
                })
            }, LONG_PRESS_DELAY)
        }

        // 拖拽中的样式
        const isDragged = dragState.isDragging && dragState.dragIndex === index
        const style: React.CSSProperties = isDragged
            ? { opacity: 0, visibility: 'hidden' as const }
            : {}

        const className = isDragged ? 'drag-source' : ''

        return {
            onPointerDown,
            style,
            className,
            'data-drag-index': index,
        }
    }, [enabled, dragState, handlePointerMove, handlePointerUp, collectItemRects, createGhost])

    // 清理：组件卸载时移除全局监听和幽灵
    useEffect(() => {
        return () => {
            const state = stateRef.current
            if (state.longPressTimer) {
                clearTimeout(state.longPressTimer)
            }
            removeGhost()
            document.body.style.overflow = ''
            document.body.style.userSelect = ''
        }
    }, [removeGhost])

    return { items, getDragItemProps, dragState }
}
