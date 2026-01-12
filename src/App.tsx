import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { Toast, ToastType } from '@/components/Toast'
import { translations } from '@/i18n/translations'
import { AccountCard } from '@/components/AccountCard'
import { useAccounts } from '@/hooks/useAccounts'
import { useLanguage } from '@/hooks/useLanguage'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useWebAuthn } from '@/hooks/useWebAuthn'
import { useInitialData } from '@/hooks/useInitialData'
import { Plus, Settings, Sun, Moon, Languages, X, Keyboard, Search, Download, Trash2 } from 'lucide-react'

// Lazy load heavy components
const AddAccountPage = lazy(() => import('@/components/AddAccountPage'))
const ExportDialog = lazy(() => import('@/components/ExportDialog'))

function App() {
	// Batch all storage initialization into one call
	const { data: initialData, isLoading } = useInitialData()

	const { accounts, addAccount, addAccounts, removeAccounts, replaceAccount } = useAccounts(initialData?.accounts)
	const { language, changeLanguage, t } = useLanguage(initialData?.language)
	const { isDark, toggleDarkMode } = useDarkMode(initialData?.darkMode)
	const { isRegistered, register, authenticate } = useWebAuthn(initialData?.webauthnCredentialId)
	const [search, setSearch] = useState('')
	const [showExport, setShowExport] = useState(false)
	const [exportMode, setExportMode] = useState(false)
	const [deleteMode, setDeleteMode] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const [showSearch, setShowSearch] = useState(false)
	const [showSettings, setShowSettings] = useState(false)
	const [showAddPage, setShowAddPage] = useState(false)
	const [showShortcuts, setShowShortcuts] = useState(false)
	const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
	const settingsRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
				setShowSettings(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])



	const filteredAccounts = useMemo(() => {
		if (!search) return accounts
		const lower = search.toLowerCase()
		return accounts.filter(
			(acc) =>
				acc.issuer.toLowerCase().includes(lower) ||
				acc.account.toLowerCase().includes(lower)
		)
	}, [accounts, search])

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	const toggleSelectAll = () => {
		if (selectedIds.size === filteredAccounts.length) {
			setSelectedIds(new Set())
		} else {
			setSelectedIds(new Set(filteredAccounts.map((acc) => acc.id)))
		}
	}

	const handleExport = async () => {
		setToast(null)

		if (!isRegistered) {
			const success = await register()
			if (!success) {
				setToast({ message: t('registrationFailed'), type: 'error' })
				return
			}
		}

		const authenticated = await authenticate()
		if (!authenticated) {
			setToast({ message: t('authenticationFailed'), type: 'error' })
			return
		}

		setShowExport(true)
		setExportMode(false)
	}

	const handleDeleteConfirm = () => {
		removeAccounts(selectedIds)
		setShowDeleteConfirm(false)
		setDeleteMode(false)
		setSelectedIds(new Set())
	}

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl/Cmd + F: Focus search
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault()
				setShowSearch(true)
				setTimeout(() => {
					document.querySelector<HTMLInputElement>('input[type="text"]')?.focus()
				}, 100)
			}

			// Ctrl/Cmd + N: Add new account
			if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
				e.preventDefault()
				if (!showAddPage && !exportMode && !deleteMode) {
					setShowAddPage(true)
				}
			}

			// Ctrl/Cmd + Q: Cancel modes or close dialogs
			if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
				e.preventDefault()
				if (showAddPage) {
					setShowAddPage(false)
				} else if (showExport) {
					setShowExport(false)
				} else if (showDeleteConfirm) {
					setShowDeleteConfirm(false)
				} else if (exportMode) {
					setExportMode(false)
					setSelectedIds(new Set())
				} else if (deleteMode) {
					setDeleteMode(false)
					setSelectedIds(new Set())
				} else if (showSearch) {
					setShowSearch(false)
					setSearch('')
				}
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [showAddPage, showExport, showDeleteConfirm, exportMode, deleteMode, showSearch])

	// Show loading state while initializing
	if (isLoading) {
		return (
			<div className={`page-container flex items-center justify-center h-screen ${isDark ? 'dark bg-gray-900' : 'bg-[#FAFAFA]'}`}>
				<div className="text-gray-500">Loading...</div>
			</div>
		)
	}

	return (
		<>
			{showAddPage ? (
				<Suspense fallback={
					<div className={`page-container ${isDark ? 'dark bg-gray-900 text-white' : 'bg-[#fafafa]'}`}>
						<div className="flex items-center justify-center h-full">
							<div className="text-gray-500 dark:text-gray-400">Loading...</div>
						</div>
					</div>
				}>
					<AddAccountPage
						existingAccounts={accounts}
						onImport={addAccount}
						onImportMultiple={addAccounts}
						onReplace={replaceAccount}
						onBack={() => setShowAddPage(false)}
						isDark={isDark}
					/>
				</Suspense>
			) : (
				<div className={`page-container relative ${isDark ? 'dark bg-gray-900 text-white' : 'bg-[#FAFAFA]'}`}>
					{/* 顶部区域 */}
					<div className={`p-2 fixed top-0 left-0 right-0 backdrop-blur-2xl z-50`}>
						<div className="flex items-center justify-between">
							{!exportMode && !deleteMode && (
								<button
									onClick={() => {
										setShowAddPage(true)
										setToast(null) // Clear any existing toast
									}}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
									title="添加账号"
								>
									<Plus size={18} />
								</button>
							)}
							{(exportMode || deleteMode) && <div className="w-10" />}
							<span className="font-semibold tracking-widest">{t('home')}</span>
							<div className="relative" ref={settingsRef}>
								<button
									onClick={() => setShowSettings(!showSettings)}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
									title="设置"
								>
									<Settings size={18} />
								</button>
								{showSettings && (
									<div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[999]">
										<button
											onClick={() => {
												toggleDarkMode()
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white rounded-t-lg flex items-center gap-2"
										>
											{isDark ? <Sun size={16} /> : <Moon size={16} />}
											<span>{isDark ? t('lightMode') : t('darkMode')}</span>
										</button>
										<button
											onClick={() => {
												const newLang = language === 'zh-CN' ? 'en-US' : 'zh-CN'
												changeLanguage(newLang)
												setToast({
													message: translations[newLang].switchLanguageSuccess,
													type: 'success',
												})
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
										>
											<Languages size={16} />
											<span>{language === 'zh-CN' ? '简体中文' : 'English'}</span>
										</button>

										<div className="border-t border-gray-200 dark:border-gray-700"></div>

										<button
											onClick={() => {
												setShowSearch(!showSearch)
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
										>
											<Search size={16} />
											<span>{t('search')}</span>
										</button>
										<button
											onClick={() => {
												setExportMode(true)
												setDeleteMode(false)
												setSelectedIds(new Set())
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
										>
											<Download size={16} />
											<span>{t('export')}</span>
										</button>
										<button
											onClick={() => {
												setDeleteMode(true)
												setExportMode(false)
												setSelectedIds(new Set())
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2 text-red-600 dark:text-red-400"
										>
											<Trash2 size={16} />
											<span>{t('delete')}</span>
										</button>

										<div className="border-t border-gray-200 dark:border-gray-700"></div>

										{/* GitHub Repository Link */}
										<button
											onClick={() => {
												window.open('https://github.com/14Kay/chrome-TOTP-manager', '_blank')
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
										>
											<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
												<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
											</svg>
											<span>{t('githubRepo')}</span>
										</button>

										{/* Keyboard Shortcuts Button */}
										<button
											onClick={() => {
												setShowShortcuts(true)
												setShowSettings(false)
											}}
											className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white rounded-b-lg flex items-center gap-2"
										>
											<Keyboard size={16} />
											<span>{t('keyboardShortcuts')}</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* 列表区域 */}
					<div className="pt-[50px] overflow-y-auto p-3 h-full">
						{showSearch && (
							<div className='pb-3 pt-1'>
								<input
									type="text"
									placeholder={t('searchPlaceholder')}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
								/>
							</div>
						)}
						{(exportMode || deleteMode) && filteredAccounts.length > 0 && (
							<div className="mb-2 flex gap-2">
								<button
									onClick={toggleSelectAll}
									className="px-3 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
								>
									{selectedIds.size === filteredAccounts.length ? t('deselectAll') : t('selectAll')}
								</button>
								<span className="text-xs text-gray-500 py-1">
									{t('selectedCount')} {selectedIds.size} {t('items')}
								</span>
							</div>
						)}
						{filteredAccounts.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-gray-500">
								<p className="text-base mb-2">{t('noAccounts')}</p>
								<p className="text-sm text-center mb-4">{t('clickToAdd')}</p>
								<button
									onClick={() => setShowAddPage(true)}
									className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
								>
									<Plus size={18} />
									<span>{t('addAccount')}</span>
								</button>
							</div>
						) : (
							<>
								<div className="space-y-3 overflow-x-hidden w-full">
									{filteredAccounts.map((account) => (
										<AccountCard
											key={account.id}
											account={account}
											selectable={exportMode || deleteMode}
											selected={selectedIds.has(account.id)}
											onSelect={toggleSelect}
											onCopy={() => setToast({ message: t('copiedToClipboard'), type: 'success' })}
										/>
									))}
								</div>
								<div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-3">
									{t('clickToCopy')}
								</div>
							</>
						)}
					</div>

					{/* 导出模式底部栏 */}
					{exportMode && (
						<div className="p-3 border-t bg-white dark:bg-gray-800 flex gap-2">
							<button
								onClick={handleExport}
								disabled={selectedIds.size === 0}
								className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								{t('confirmExport')}
							</button>
							<button
								onClick={() => {
									setExportMode(false)
									setSelectedIds(new Set())
								}}
								className="flex-1 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
							>
								{t('cancel')}
							</button>
						</div>
					)}

					{/* 删除模式底部栏 */}
					{deleteMode && (
						<div className="p-3 border-t bg-white dark:bg-gray-800 flex gap-2">
							<button
								onClick={() => setShowDeleteConfirm(true)}
								disabled={selectedIds.size === 0}
								className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								{t('delete')}
							</button>
							<button
								onClick={() => {
									setDeleteMode(false)
									setSelectedIds(new Set())
								}}
								className="flex-1 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
							>
								{t('cancel')}
							</button>
						</div>
					)}

					{/* 删除确认弹窗 */}
					{showDeleteConfirm && (
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
							<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
								<h2 className="text-lg font-bold mb-2 dark:text-white">{t('deleteConfirmTitle')}</h2>
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
									{t('deleteConfirmMessage').replace('{count}', selectedIds.size.toString())}
								</p>
								<div className="flex gap-2">
									<button
										onClick={handleDeleteConfirm}
										className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
									>
										{t('confirmDelete')}
									</button>
									<button
										onClick={() => setShowDeleteConfirm(false)}
										className="flex-1 py-2 border rounded-lg hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white text-sm"
									>
										{t('cancel')}
									</button>
								</div>
							</div>
						</div>
					)}

					{showExport && (
						<Suspense fallback={null}>
							<ExportDialog
								accounts={accounts.filter((acc) => selectedIds.has(acc.id))}
								onClose={() => {
									setShowExport(false)
									setExportMode(false)
									setSelectedIds(new Set())
								}}
							/>
						</Suspense>
					)}

					{/* Toast Notifications */}
					{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

					{/* Keyboard Shortcuts Dialog */}
					{showShortcuts && (
						<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
							<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-bold dark:text-white">{t('keyboardShortcuts')}</h2>
									<button
										onClick={() => setShowShortcuts(false)}
										className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
									>
										<X size={20} className="dark:text-white" />
									</button>
								</div>
								<div className="space-y-3">
									{/* Search Shortcut */}
									<div className="flex items-center justify-between">
										<span className="text-sm dark:text-gray-300">{t('shortcutSearch')}</span>
										<div className="flex items-center gap-1">
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
											</kbd>
											<span className="text-gray-400">+</span>
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												F
											</kbd>
										</div>
									</div>
									{/* Add Account Shortcut */}
									<div className="flex items-center justify-between">
										<span className="text-sm dark:text-gray-300">{t('shortcutAdd')}</span>
										<div className="flex items-center gap-1">
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
											</kbd>
											<span className="text-gray-400">+</span>
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												N
											</kbd>
										</div>
									</div>
									{/* Close/Cancel Shortcut */}
									<div className="flex items-center justify-between">
										<span className="text-sm dark:text-gray-300">{t('shortcutClose')}</span>
										<div className="flex items-center gap-1">
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
											</kbd>
											<span className="text-gray-400">+</span>
											<kbd className="px-2 py-1 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded shadow-sm text-sm font-semibold dark:text-white">
												Q
											</kbd>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</>
	)
}

export default App
