import { useState, useEffect } from 'react'
import { getTOTPCode, getRemainingSeconds } from '@/lib/totp'

export function useTOTP(secret: string) {
	const [code, setCode] = useState(() => getTOTPCode(secret))
	const [remaining, setRemaining] = useState(() => getRemainingSeconds())

	useEffect(() => {
		const interval = setInterval(() => {
			const newRemaining = getRemainingSeconds()
			setRemaining(newRemaining)
			if (newRemaining === 30) {
				setCode(getTOTPCode(secret))
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [secret])

	return { code, remaining }
}
