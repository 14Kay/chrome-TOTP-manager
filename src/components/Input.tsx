import { LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string
	icon: LucideIcon
}

export function Input({ label, icon: Icon, className = '', ...props }: InputProps) {
	return (
		<div>
			<label className="block text-sm font-medium mb-1 dark:text-gray-200">{label}</label>
			<div className="relative">
				<Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
				<input
					{...props}
					className={`w-full pl-10 pr-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm ${className}`}
				/>
			</div>
		</div>
	)
}
