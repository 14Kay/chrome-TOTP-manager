import { useState, useEffect } from 'react'

const CREDENTIAL_KEY = 'webauthn_credential_id'

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes.buffer
}

export function useWebAuthn(initialCredentialId: string | null = null) {
	const [isRegistered, setIsRegistered] = useState(!!initialCredentialId)

	// Only check localStorage if initial data wasn't provided
	useEffect(() => {
		if (!initialCredentialId) {
			const credentialId = localStorage.getItem(CREDENTIAL_KEY)
			setIsRegistered(!!credentialId)
		}
	}, [])

	const register = async () => {
		try {
			const challenge = new Uint8Array(32)
			crypto.getRandomValues(challenge)

			const credential = await navigator.credentials.create({
				publicKey: {
					challenge,
					rp: { name: 'TOTP Manager' },
					user: {
						id: new Uint8Array(16),
						name: 'user',
						displayName: 'User',
					},
					pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
					authenticatorSelection: {
						userVerification: 'required',
					},
					timeout: 60000,
				},
			}) as PublicKeyCredential

			if (credential && credential.rawId) {
				const credentialIdBase64 = arrayBufferToBase64url(credential.rawId)
				localStorage.setItem(CREDENTIAL_KEY, credentialIdBase64)
				setIsRegistered(true)
				return true
			}
			return false
		} catch (error) {
			if (import.meta.env.DEV) {
				console.error('WebAuthn registration failed:', error)
			}
			return false
		}
	}

	const authenticate = async () => {
		try {
			const credentialId = localStorage.getItem(CREDENTIAL_KEY)
			if (!credentialId) return false

			const challenge = new Uint8Array(32)
			crypto.getRandomValues(challenge)

			const credential = await navigator.credentials.get({
				publicKey: {
					challenge,
					allowCredentials: [{
						id: base64urlToArrayBuffer(credentialId),
						type: 'public-key',
					}],
					userVerification: 'required',
					timeout: 60000,
				},
			})

			return !!credential
		} catch (error) {
			return false
		}
	}

	return { isRegistered, register, authenticate }
}
