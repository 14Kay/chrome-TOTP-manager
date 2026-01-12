import { useState, useEffect } from 'react'
import { Language, translations, TranslationKey } from '../i18n/translations'

const STORAGE_KEY = 'app_language'

export function useLanguage(initialLanguage: Language = 'en-US') {
	const [language, setLanguage] = useState<Language>(initialLanguage)

	// Only sync with storage if initial data wasn't provided
	useEffect(() => {
		if (!initialLanguage || initialLanguage === 'en-US') {
			chrome.storage.sync.get([STORAGE_KEY], (result) => {
				const storedLanguage = result[STORAGE_KEY];
				if (storedLanguage) {
					setLanguage(storedLanguage as Language);
				}
			});
		}
	}, []);

	const changeLanguage = (lang: Language) => {
		setLanguage(lang)
		chrome.storage.sync.set({ [STORAGE_KEY]: lang })
	}

	const t = (key: TranslationKey): string => {
		return translations[language][key]
	}

	return { language, changeLanguage, t }
}
