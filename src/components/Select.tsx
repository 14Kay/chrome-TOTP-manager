import { LucideIcon } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	label: string
	icon: LucideIcon
	options: { value: string; label: string }[]
}

export function Select({ label, icon: Icon, options, className = '', ...props }: SelectProps) {
	return (
		<div>
			<label className="block text-sm font-medium mb-1 dark:text-gray-200">{label}</label>
			<div className="relative">
				<Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
				<select
					{...props}
					className={`w-full pl-10 pr-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm ${className}`}
				>
					{options.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>
			</div>
		</div>
	)
}
