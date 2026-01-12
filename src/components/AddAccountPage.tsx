import { useState, useRef } from 'react'
import jsQR from 'jsqr'
import { QrCode, ArrowLeft, Tag, User, Key, List } from 'lucide-react'
import type { Account } from '@/types'
import { Input } from './Input'
import { Select } from './Select'
import { Toast, ToastType } from './Toast'
import { useLanguage } from '@/hooks/useLanguage'
import { parseGoogleAuthMigration } from '@/lib/googleAuthMigration'

interface AddAccountPageProps {
	existingAccounts: Account[]
	onImport: (account: Account) => void
	onImportMultiple: (accounts: Account[]) => void
	onReplace: (oldId: string, newAccount: Account) => void
	onBack: () => void
	isDark?: boolean
}

const PLATFORMS = [
	{ name: 'Alibaba Cloud', logo: 'alibabacloud-icon.svg' },
	{ name: 'Apple', logo: 'apple-icon.svg' },
	{ name: 'Bing', logo: 'bing-icon.svg' },
	{ name: 'Cloudflare', logo: 'cloudflare-icon.svg' },
	{ name: 'Epic Games', logo: 'epicgames-icon.svg' },
	{ name: 'GitHub', logo: 'github-icon.svg' },
	{ name: 'GitLab', logo: 'gitlab-icon.svg' },
	{ name: 'Gmail', logo: 'gmail-icon.svg' },
	{ name: 'Google', logo: 'google-icon.svg' },
	{ name: 'IBM', logo: 'ibm-icon.svg' },
	{ name: 'Instagram', logo: 'instagram-icon.svg' },
	{ name: 'Metabase', logo: 'metabase-icon.svg' },
	{ name: 'Microsoft', logo: 'microsoft-icon.svg' },
	{ name: 'Microsoft Edge', logo: 'microsoft_edge-icon.svg' },
	{ name: 'npm', logo: 'npmjs-icon.svg' },
	{ name: 'Rockstar Games', logo: 'rockstargames-icon.svg' },
	{ name: 'Twitter', logo: 'twitter-icon.svg' },
	{ name: 'Zoom', logo: 'zoomus-icon.svg' },
]

export function AddAccountPage({ existingAccounts, onImport, onImportMultiple, onReplace, onBack, isDark }: AddAccountPageProps) {
	const { t } = useLanguage()
	const [issuer, setIssuer] = useState('')
	const [account, setAccount] = useState('')
	const [secret, setSecret] = useState('')
	const [logo, setLogo] = useState('')
	const [isDragging, setIsDragging] = useState(false)
	const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
	const [pendingAccounts, setPendingAccounts] = useState<Account[]>([])
	const [showImportDialog, setShowImportDialog] = useState(false)
	const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
	const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
	const [duplicateAccount, setDuplicateAccount] = useState<{ existing: Account; new: Account } | null>(null)
	const formRef = useRef<HTMLDivElement>(null)

	const validateSecret = (secret: string): boolean => {
		const cleaned = secret.replace(/\s/g, '').toUpperCase()
		return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length >= 16
	}

	const parseOtpauth = (url: string) => {
		try {
			const parsed = new URL(url)
			if (parsed.protocol !== 'otpauth:') {
				setToast({ message: t('qrRecognizeFailed'), type: 'error' })
				return
			}

			const pathParts = parsed.pathname.slice(1).split(':')
			const accountName = pathParts[pathParts.length - 1]
			const issuerName = pathParts.length > 1 ? pathParts[0] : parsed.searchParams.get('issuer') || ''
			const secretKey = parsed.searchParams.get('secret') || ''

			if (secretKey) {
				setIssuer(issuerName)
				setAccount(accountName)
				setSecret(secretKey)
				setToast({ message: t('qrRecognized'), type: 'success' })
				setTimeout(() => {
					formRef.current?.scrollTo({ top: formRef.current.scrollHeight, behavior: 'smooth' })
				}, 100)
			} else {
				setToast({ message: t('qrRecognizeFailed'), type: 'error' })
			}
		} catch (err) {
			setToast({ message: t('qrRecognizeFailed'), type: 'error' })
		}
	}

	const processImage = (file: File) => {
		const reader = new FileReader()
		reader.onload = (event) => {
			const img = new Image()
			img.onload = () => {
				const canvas = document.createElement('canvas')
				canvas.width = img.width
				canvas.height = img.height
				const ctx = canvas.getContext('2d')
				if (!ctx) return

				ctx.drawImage(img, 0, 0)
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const code = jsQR(imageData.data, imageData.width, imageData.height)

				if (code?.data) {
					if (code.data.startsWith('otpauth-migration://')) {
						const accounts = parseGoogleAuthMigration(code.data)
						if (accounts.length > 0) {
							setPendingAccounts(accounts)
							setSelectedAccountIds(new Set(accounts.map(acc => acc.id)))
							setShowImportDialog(true)
						} else {
							setToast({ message: t('qrRecognizeFailed'), type: 'error' })
						}
					} else {
						parseOtpauth(code.data)
					}
				} else {
					setToast({ message: t('qrRecognizeFailed'), type: 'error' })
				}
			}
			img.src = event.target?.result as string
		}
		reader.readAsDataURL(file)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const file = e.dataTransfer.files[0]
		if (file?.type.startsWith('image/')) processImage(file)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = () => setIsDragging(false)

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			processImage(file)
			// Reset the input value to allow selecting the same file again
			e.target.value = ''
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!issuer || !account || !secret) return

		if (!validateSecret(secret)) {
			setToast({ message: t('invalidSecretFormat'), type: 'error' })
			return
		}

		const newAccount: Account = {
			id: crypto.randomUUID(),
			issuer,
			account,
			secret: secret.replace(/\s/g, '').toUpperCase(),
			logo: logo || undefined,
		}

		// Check for duplicate account (same issuer and account name)
		const existingAccount = existingAccounts.find(
			acc => acc.issuer === issuer && acc.account === account
		)

		if (existingAccount) {
			// Show duplicate confirmation dialog
			setDuplicateAccount({ existing: existingAccount, new: newAccount })
			setShowDuplicateDialog(true)
		} else {
			// No duplicate, add directly
			onImport(newAccount)
			onBack()
		}
	}

	const handleReplaceDuplicate = () => {
		if (duplicateAccount) {
			onReplace(duplicateAccount.existing.id, duplicateAccount.new)
			setShowDuplicateDialog(false)
			setDuplicateAccount(null)
			onBack()
		}
	}

	const handleCreateNew = () => {
		if (duplicateAccount) {
			onImport(duplicateAccount.new)
			setShowDuplicateDialog(false)
			setDuplicateAccount(null)
			onBack()
		}
	}

	const handlePlatformSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selected = PLATFORMS.find(p => p.logo === e.target.value)
		if (selected) {
			setIssuer(selected.name)
			setLogo(selected.logo)
		} else {
			setLogo('')
		}
	}

	const handleConfirmImport = () => {
		const selectedAccounts = pendingAccounts.filter(acc => selectedAccountIds.has(acc.id))
		if (selectedAccounts.length === 0) {
			setToast({ message: t('pleaseSelectAtLeastOne'), type: 'error' })
			return
		}
		onImportMultiple(selectedAccounts)
		setShowImportDialog(false)
		setPendingAccounts([])
		setSelectedAccountIds(new Set())
		setToast({ message: `${t('qrRecognized')} - ${selectedAccounts.length} ${t('items')}`, type: 'success' })
		setTimeout(() => {
			onBack()
		}, 2000)
	}

	const toggleAccountSelection = (id: string) => {
		setSelectedAccountIds(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	const toggleSelectAllAccounts = () => {
		if (selectedAccountIds.size === pendingAccounts.length) {
			setSelectedAccountIds(new Set())
		} else {
			setSelectedAccountIds(new Set(pendingAccounts.map(acc => acc.id)))
		}
	}

	return (
		<div className={`page-container ${isDark ? 'dark bg-gray-900 text-white' : 'bg-[#fafafa]'}`}>
			<div className="page-header">
				<div className="flex items-center justify-between">
					<button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
						<ArrowLeft size={18} />
					</button>
					<span className="font-semibold">{t('addAccount')}</span>
					<div className="w-10"></div>
				</div>
			</div>

			<div ref={formRef} className="flex-1 overflow-y-auto p-4 pt-0">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onClick={() => document.getElementById('qr-upload')?.click()}
						className={`card-block border-2 border-dashed text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
							}`}
					>
						<input
							id="qr-upload"
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className="hidden"
						/>
						<div className="text-gray-600 dark:text-gray-400">
							<QrCode className="w-10 h-10 mx-auto mb-2" />
							<div className="font-medium text-sm">{t('clickOrDragQR')}</div>
							<div className="text-xs text-gray-400 mt-1">{t('supportedFormats')}</div>
						</div>
					</div>
					<div className="text-xs text-gray-500 dark:text-gray-400 text-center">{t('orManualInput')}</div>
					<div className="space-y-4 card-block dark:bg-gray-800">
						<Select
							label={t('selectPlatform')}
							icon={List}
							value={logo}
							onChange={handlePlatformSelect}
							className="input"
							options={[
								{ value: '', label: t('customPlatform') },
								...PLATFORMS.map(p => ({ value: p.logo, label: p.name })),
							]}
						/>
						<Input
							label={t('platformName')}
							icon={Tag}
							type="text"
							value={issuer}
							onChange={(e) => setIssuer(e.target.value)}
							placeholder={t('exampleGoogle')}
							className="input"
							required
						/>
						<Input
							label={t('accountName')}
							icon={User}
							type="text"
							value={account}
							onChange={(e) => setAccount(e.target.value)}
							placeholder={t('exampleEmail')}
							className="input"
							required
						/>
						<Input
							label={t('secretKey')}
							icon={Key}
							type="text"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							placeholder={t('base32Format')}
							className="input"
							required
						/>
					</div>
					<button
						type="submit"
						className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
					>
						{t('add')}
					</button>
				</form>
			</div>

			{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

			{showImportDialog && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
						<h2 className="text-lg font-bold mb-2 dark:text-white">{t('multiAccountDetected')}</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
							{t('multiAccountSummary')
								.replace('{total}', pendingAccounts.length.toString())
								.replace('{selected}', selectedAccountIds.size.toString())}
						</p>
						<button
							onClick={toggleSelectAllAccounts}
							className="text-sm text-blue-500 dark:text-blue-400 hover:underline mb-3 text-left"
						>
							{selectedAccountIds.size === pendingAccounts.length ? t('deselectAll') : t('selectAll')}
						</button>
						<div className="flex-1 overflow-y-auto mb-4 space-y-2">
							{pendingAccounts.map((acc) => (
								<div
									key={acc.id}
									onClick={() => toggleAccountSelection(acc.id)}
									className="flex items-center gap-1 p-1 px-2 bg-gray-50 dark:bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								>
									<input
										type="checkbox"
										checked={selectedAccountIds.has(acc.id)}
										onChange={() => toggleAccountSelection(acc.id)}
										className="w-3 h-3 flex-shrink-0"
										onClick={(e) => e.stopPropagation()}
									/>
									<div className="flex-1 min-w-0">
										<div className="font-medium dark:text-white truncate text-xs">{acc.issuer}</div>
										<div className="text-gray-500 dark:text-gray-400 text-[10px] truncate">{acc.account}</div>
									</div>
								</div>
							))}
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleConfirmImport}
								disabled={selectedAccountIds.size === 0}
								className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								{t('importSelected').replace('{count}', selectedAccountIds.size.toString())}
							</button>
							<button
								onClick={() => {
									setShowImportDialog(false)
									setPendingAccounts([])
									setSelectedAccountIds(new Set())
								}}
								className="flex-1 py-2 border rounded-lg hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white text-sm"
							>
								{t('cancel')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Duplicate Account Confirmation Dialog */}
			{showDuplicateDialog && duplicateAccount && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
						<h2 className="text-lg font-bold mb-2 dark:text-white">{t('duplicateAccountDetected')}</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
							{t('duplicateAccountMessage')
								.replace('{issuer}', duplicateAccount.existing.issuer)
								.replace('{account}', duplicateAccount.existing.account)}
						</p>
						<div className="flex gap-2">
							<button
								onClick={handleReplaceDuplicate}
								className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
							>
								{t('replaceExisting')}
							</button>
							<button
								onClick={handleCreateNew}
								className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
							>
								{t('createNew')}
							</button>
						</div>
						<button
							onClick={() => {
								setShowDuplicateDialog(false)
								setDuplicateAccount(null)
							}}
							className="w-full mt-2 py-2 border rounded-lg hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white text-sm"
						>
							{t('cancel')}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default AddAccountPage
