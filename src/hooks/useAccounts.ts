import { useState, useEffect } from 'react'
import type { Account } from '@/types'

const STORAGE_KEY = 'totp_accounts'

export function useAccounts(initialAccounts: Account[] = []) {
	const [accounts, setAccounts] = useState<Account[]>(initialAccounts)

	// Only sync with storage if initial data wasn't provided
	useEffect(() => {
		if (initialAccounts.length === 0) {
			chrome.storage.sync.get([STORAGE_KEY], (result) => {
				setAccounts((result[STORAGE_KEY] as Account[]) || [])
			})
		}
	}, [])

	const addAccount = (account: Account) => {
		const newAccounts = [...accounts, account]
		setAccounts(newAccounts)
		chrome.storage.sync.set({ [STORAGE_KEY]: newAccounts })
	}

	const addAccounts = (newAccounts: Account[]) => {
		const updatedAccounts = [...accounts, ...newAccounts]
		setAccounts(updatedAccounts)
		chrome.storage.sync.set({ [STORAGE_KEY]: updatedAccounts })
	}

	const removeAccounts = (ids: Set<string>) => {
		const newAccounts = accounts.filter((acc) => !ids.has(acc.id))
		setAccounts(newAccounts)
		chrome.storage.sync.set({ [STORAGE_KEY]: newAccounts })
	}

	const replaceAccount = (oldId: string, newAccount: Account) => {
		const newAccounts = accounts.map((acc) =>
			acc.id === oldId ? newAccount : acc
		)
		setAccounts(newAccounts)
		chrome.storage.sync.set({ [STORAGE_KEY]: newAccounts })
	}

	return { accounts, addAccount, addAccounts, removeAccounts, replaceAccount }
}
