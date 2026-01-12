import OTPAuth from '@14kay/totp-auth'

export function getTOTPCode(secret: string): string {
	return OTPAuth.totp(secret)
}

export function getRemainingSeconds(): number {
	return OTPAuth.timeRemaining()
}
