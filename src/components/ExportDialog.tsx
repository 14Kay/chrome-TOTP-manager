import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Account } from '@/types'
import { generateGoogleAuthMigration } from '@/lib/googleAuthMigration'
import { useLanguage } from '@/hooks/useLanguage'
import { Toast, ToastType } from './Toast'

interface ExportDialogProps {
	accounts: Account[]
	onClose: () => void
}

export function ExportDialog({ accounts, onClose }: ExportDialogProps) {
	const { t } = useLanguage()
	const [qrDataUrl, setQrDataUrl] = useState('')
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

	useEffect(() => {
		const generateQR = async () => {
			try {
				setLoading(true)
				setError('')
				const migrationUrl = generateGoogleAuthMigration(accounts)
				const dataUrl = await QRCode.toDataURL(migrationUrl, { width: 512 })
				setQrDataUrl(dataUrl)
				setLoading(false)
			} catch (err) {
				setError(t('qrCodeError'))
				setLoading(false)
				console.error('QR code generation failed:', err)
			}
		}
		generateQR()
	}, [accounts])

	const handleSave = () => {
		if (!qrDataUrl) return
		const a = document.createElement('a')
		a.href = qrDataUrl
		a.download = `totp-accounts-${Date.now()}.png`
		a.click()

		// Show security warning
		setTimeout(() => {
			setToast({ message: t('qrDownloadWarning'), type: 'warning' })
		}, 100)
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold mb-4 dark:text-white">{t('exportAccounts')}</h2>
				<div className="flex flex-col items-center space-y-4">
					{loading && (
						<div className="w-[256px] h-[256px] flex items-center justify-center border rounded bg-gray-50 dark:bg-gray-700">
							<p className="text-gray-500 dark:text-gray-400">{t('generateQRCode')}</p>
						</div>
					)}
					{error && (
						<div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
							<p className="text-red-600 dark:text-red-400 text-center">{error}</p>
						</div>
					)}
					{!loading && !error && qrDataUrl && (
						<>
							<img src={qrDataUrl} alt="QR Code" className="border rounded dark:border-gray-600" />
							<div className="w-full px-2 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
								<p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
									{t('exportQRInstruction')}
								</p>
							</div>
						</>
					)}
					<p className="text-sm text-gray-500 dark:text-gray-400 text-center">
						{t('selectedAccounts').replace('{count}', accounts.length.toString())}
					</p>
					<div className="flex gap-2 w-full">
						<button
							onClick={handleSave}
							disabled={loading || !!error}
							className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{t('downloadQRCode')}
						</button>
						<button
							onClick={onClose}
							className="flex-1 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
						>
							{t('close')}
						</button>
					</div>
				</div>
			</div>

			{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
		</div>
	)
}

export default ExportDialog
