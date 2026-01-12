import { useState, useEffect } from 'react'
import type { Language } from '@/i18n/translations'
import type { Account } from '@/types'

const STORAGE_KEYS = {
    ACCOUNTS: 'totp_accounts',
    LANGUAGE: 'app_language',
    DARK_MODE: 'app_dark_mode',
    WEBAUTHN: 'webauthn_credential_id',
}

export interface InitialData {
    accounts: Account[]
    language: Language
    darkMode: boolean
    webauthnCredentialId: string | null
}

export function useInitialData() {
    const [data, setData] = useState<InitialData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Batch all Chrome storage calls into one
        chrome.storage.sync.get(
            [STORAGE_KEYS.ACCOUNTS, STORAGE_KEYS.LANGUAGE, STORAGE_KEYS.DARK_MODE],
            (result) => {
                // Get webauthn from localStorage (synchronous)
                const webauthnCredentialId = localStorage.getItem(STORAGE_KEYS.WEBAUTHN)

                setData({
                    accounts: (result[STORAGE_KEYS.ACCOUNTS] as Account[]) || [],
                    language: (result[STORAGE_KEYS.LANGUAGE] as Language) || 'en-US',
                    darkMode: (result[STORAGE_KEYS.DARK_MODE] as boolean) ?? false,
                    webauthnCredentialId,
                })
                setIsLoading(false)
            }
        )
    }, [])

    return { data, isLoading }
}
