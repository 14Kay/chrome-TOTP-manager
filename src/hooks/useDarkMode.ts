import { useState, useEffect } from 'react'

const STORAGE_KEY = 'app_dark_mode'

export function useDarkMode(initialDarkMode: boolean = false) {
	const [isDark, setIsDark] = useState(initialDarkMode)

	// Only sync with storage if initial data wasn't provided
	useEffect(() => {
		if (!initialDarkMode) {
			chrome.storage.sync.get([STORAGE_KEY], (result) => {
				const storedDarkMode = result[STORAGE_KEY]
				if (typeof storedDarkMode === 'boolean') {
					setIsDark(storedDarkMode)
				}
			})
		}
	}, [])

	const toggleDarkMode = () => {
		setIsDark((prev) => {
			const newValue = !prev
			chrome.storage.sync.set({ [STORAGE_KEY]: newValue })
			return newValue
		})
	}

	return { isDark, toggleDarkMode }
}
