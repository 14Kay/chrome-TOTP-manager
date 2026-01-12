import { useTOTP } from '@/hooks/useTOTP'
import { useLanguage } from '@/hooks/useLanguage'
import type { Account } from '@/types'

interface AccountCardProps {
	account: Account
	selectable?: boolean
	selected?: boolean
	onSelect?: (id: string) => void
	onCopy?: () => void
}

const LOGO_MAP: Record<string, string> = {
	'alibabacloud': 'alibabacloud-icon.svg',
	'alibaba': 'alibabacloud-icon.svg',
	'apple': 'apple-icon.svg',
	'bing': 'bing-icon.svg',
	'cloudflare': 'cloudflare-icon.svg',
	'epic': 'epicgames-icon.svg',
	'epicgames': 'epicgames-icon.svg',
	'github': 'github-icon.svg',
	'gitlab': 'gitlab-icon.svg',
	'gmail': 'gmail-icon.svg',
	'google': 'google-icon.svg',
	'ibm': 'ibm-icon.svg',
	'instagram': 'instagram-icon.svg',
	'metabase': 'metabase-icon.svg',
	'microsoft': 'microsoft-icon.svg',
	'microsoftedge': 'microsoft_edge-icon.svg',
	'edge': 'microsoft_edge-icon.svg',
	'npm': 'npmjs-icon.svg',
	'npmjs': 'npmjs-icon.svg',
	'rockstar': 'rockstargames-icon.svg',
	'rockstargames': 'rockstargames-icon.svg',
	'twitter': 'twitter-icon.svg',
	'zoom': 'zoomus-icon.svg',
	'zoomus': 'zoomus-icon.svg',
}

const matchLogo = (issuer: string): string | undefined => {
	const normalized = issuer.toLowerCase().replace(/\s+/g, '')
	return LOGO_MAP[normalized]
}

export function AccountCard({ account, selectable, selected, onSelect, onCopy }: AccountCardProps) {
	const { code, remaining } = useTOTP(account.secret)
	const { t } = useLanguage()
	const isLowTime = remaining <= 5
	const displayLogo = account.logo || matchLogo(account.issuer)

	const handleCopy = () => {
		navigator.clipboard.writeText(code)
		onCopy?.()
	}

	const radius = 9
	const circumference = 2 * Math.PI * radius
	const offset = ((30 - remaining) / 30) * circumference

	return (
		<div className="flex items-center gap-3">
			{selectable && (
				<input
					type="checkbox"
					checked={selected}
					onChange={() => onSelect?.(account.id)}
					className="w-3 h-3 flex-shrink-0"
				/>
			)}
			<div className={`bg-white dark:bg-gray-800 rounded-md ${selectable ? 'p-1 py-2' : 'p-3'} flex-1 min-w-0`}>

				{/* 顶部：Logo + 邮箱 (左) 和 倒计时 (右) */}
				<div className="flex items-start justify-between items-center mb-4">
					<div className="flex items-center gap-2 flex-1 min-w-0">
						{displayLogo ? (
							<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white dark:bg-gray-700 p-1">
								<img src={`/logos/${displayLogo}`} alt={account.issuer} className="w-full h-full object-contain" />
							</div>
						) : (
							<div className="w-8 h-8 bg-[#fafafa] rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 dark:bg-gray-700">
								{account.issuer.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="flex-1 min-w-0">
							<div className="text-xs truncate tracking-wide">{account.issuer}</div>
							<div className="text-[10px] text-gray-400 dark:text-gray-400 truncate tracking-wide">{account.account}</div>
						</div>
					</div>

					<div className="relative flex items-center justify-center flex-shrink-0">
						<svg width="26" height="26" className="transform -rotate-90">
							<circle
								cx="13"
								cy="13"
								r={radius}
								stroke="currentColor"
								strokeWidth="2"
								fill="none"
								className="text-gray-200 dark:text-gray-700"
							/>
							<circle
								cx="13"
								cy="13"
								r={radius}
								stroke="currentColor"
								strokeWidth="2"
								fill="none"
								strokeDasharray={circumference}
								strokeDashoffset={offset}
								className={`${isLowTime ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-linear`}
								strokeLinecap="round"
								style={{
									willChange: 'stroke-dashoffset',
								}}
							/>
						</svg>
					</div>
				</div>

				{/* 验证码区域 */}
				<div
					onClick={handleCopy}
					className={`flex items-center justify-between cursor-pointer rounded-lg transition min-w-0 ${selectable ? 'gap-x-2' : 'gap-x-5'}`}
					title={t('copiedToClipboard')}
				>
					<div className="flex gap-1.5">
						{code.slice(0, 3).split('').map((digit, i) => (
							<div key={i} className="w-9 h-9 bg-[#E7F4FD] dark:bg-gray-700 rounded-lg flex items-center justify-center">
								<span className="text-lg font-bold text-[#1B7BCF] dark:text-blue-400">{digit}</span>
							</div>
						))}
					</div>
					<div className="flex gap-1.5">
						{code.slice(3, 6).split('').map((digit, i) => (
							<div key={i + 3} className="w-9 h-9 bg-[#E7F4FD] dark:bg-gray-700 rounded-lg flex items-center justify-center">
								<span className="text-lg font-bold text-[#1B7BCF] dark:text-blue-400">{digit}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
