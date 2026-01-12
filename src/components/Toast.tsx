import { useEffect, useState } from 'react'
import { Check, AlertCircle, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
	message: string
	type?: ToastType
	onClose: () => void
	duration?: number
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
	const [isExiting, setIsExiting] = useState(false)
	const [isEntering, setIsEntering] = useState(true)

	useEffect(() => {
		// Trigger entrance animation
		const enterTimer = setTimeout(() => {
			setIsEntering(false)
		}, 50)

		// Start exit animation before actual close
		const exitTimer = setTimeout(() => {
			setIsExiting(true)
		}, duration - 300) // Start exit 300ms before close

		// Actually close the toast
		const closeTimer = setTimeout(() => {
			onClose()
		}, duration)

		return () => {
			clearTimeout(enterTimer)
			clearTimeout(exitTimer)
			clearTimeout(closeTimer)
		}
	}, [duration, onClose])

	const bgColors = {
		success: 'bg-green-500',
		error: 'bg-red-500',
		info: 'bg-blue-500',
		warning: 'bg-amber-500',
	}

	const icons = {
		success: <Check size={16} />,
		error: <AlertCircle size={16} />,
		info: <AlertCircle size={16} />,
		warning: <AlertTriangle size={16} />,
	}

	return (
		<div
			className={`fixed top-4 left-1/2 -translate-x-1/2 ${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-start gap-3 max-w-[95%] min-w-[200px] transition-all duration-300 ease-out ${isExiting
				? 'opacity-0 -translate-y-2 scale-95'
				: isEntering
					? 'opacity-0 translate-y-2 scale-95'
					: 'opacity-100 translate-y-0 scale-100'
				}`}
		>
			<div className="flex-shrink-0 mt-0.5">
				{icons[type]}
			</div>
			<span className="text-xs font-medium flex-1 break-words">{message}</span>
		</div>
	)
}
