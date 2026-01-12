import type { Account } from '@/types'

const base32Encode = (bytes: Uint8Array): string => {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
	let bits = 0
	let value = 0
	let output = ''

	for (let i = 0; i < bytes.length; i++) {
		value = (value << 8) | bytes[i]
		bits += 8

		while (bits >= 5) {
			output += alphabet[(value >>> (bits - 5)) & 31]
			bits -= 5
		}
	}

	if (bits > 0) {
		output += alphabet[(value << (5 - bits)) & 31]
	}

	return output
}

const base32Decode = (str: string): Uint8Array => {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
	const cleanStr = str.replace(/=+$/, '').toUpperCase()
	let bits = 0
	let value = 0
	const output: number[] = []

	for (let i = 0; i < cleanStr.length; i++) {
		const idx = alphabet.indexOf(cleanStr[i])
		if (idx === -1) continue
		value = (value << 5) | idx
		bits += 5
		if (bits >= 8) {
			output.push((value >>> (bits - 8)) & 255)
			bits -= 8
		}
	}
	return new Uint8Array(output)
}

const encodeVarint = (value: number): number[] => {
	const result: number[] = []
	while (value > 127) {
		result.push((value & 127) | 128)
		value >>>= 7
	}
	result.push(value)
	return result
}

const encodeString = (str: string): number[] => {
	const bytes = new TextEncoder().encode(str)
	return [...encodeVarint(bytes.length), ...bytes]
}

const encodeBytes = (bytes: Uint8Array): number[] => {
	return [...encodeVarint(bytes.length), ...bytes]
}

const encodeField = (fieldNumber: number, wireType: number, value: number[] | number): number[] => {
	const tag = (fieldNumber << 3) | wireType
	if (typeof value === 'number') {
		return [...encodeVarint(tag), ...encodeVarint(value)]
	}
	return [...encodeVarint(tag), ...value]
}

export const generateGoogleAuthMigration = (accounts: Account[]): string => {
	const otpParamsBytes: number[] = []

	for (const account of accounts) {
		const secret = base32Decode(account.secret)
		const params: number[] = []

		params.push(...encodeField(1, 2, encodeBytes(secret)))
		params.push(...encodeField(2, 2, encodeString(account.account)))
		params.push(...encodeField(3, 2, encodeString(account.issuer)))
		params.push(...encodeField(4, 0, 1))
		params.push(...encodeField(5, 0, 1))
		params.push(...encodeField(6, 0, 2))

		otpParamsBytes.push(...encodeField(1, 2, [...encodeVarint(params.length), ...params]))
	}

	const payload: number[] = [
		...otpParamsBytes,
		...encodeField(2, 0, 1),
		...encodeField(3, 0, 1),
		...encodeField(4, 0, 0),
		...encodeField(5, 0, Math.floor(Math.random() * 1000000)),
	]

	const buffer = new Uint8Array(payload)
	const base64 = btoa(String.fromCharCode(...buffer))
	return `otpauth-migration://offline?data=${encodeURIComponent(base64)}`
}

const decodeVarint = (data: Uint8Array, offset: number): [number, number] => {
	let value = 0
	let shift = 0
	let pos = offset

	while (pos < data.length) {
		const byte = data[pos++]
		value |= (byte & 127) << shift
		if ((byte & 128) === 0) break
		shift += 7
	}

	return [value, pos]
}

export const parseGoogleAuthMigration = (url: string): Account[] => {
	try {
		const parsed = new URL(url)
		if (parsed.protocol !== 'otpauth-migration:') return []

		const dataParam = parsed.searchParams.get('data')
		if (!dataParam) return []

		const base64 = decodeURIComponent(dataParam)
		const binary = atob(base64)
		const data = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i++) {
			data[i] = binary.charCodeAt(i)
		}

		const accounts: Account[] = []
		let pos = 0

		while (pos < data.length) {
			const [tag, nextPos] = decodeVarint(data, pos)
			pos = nextPos
			const fieldNumber = tag >> 3
			const wireType = tag & 7

			if (fieldNumber === 1 && wireType === 2) {
				const [length, afterLength] = decodeVarint(data, pos)
				pos = afterLength
				const paramData = data.slice(pos, pos + length)
				pos += length

				let secret = ''
				let account = ''
				let issuer = ''
				let paramPos = 0

				while (paramPos < paramData.length) {
					const [paramTag, nextParamPos] = decodeVarint(paramData, paramPos)
					paramPos = nextParamPos
					const paramField = paramTag >> 3
					const paramWire = paramTag & 7

					if (paramField === 1 && paramWire === 2) {
						const [len, afterLen] = decodeVarint(paramData, paramPos)
						paramPos = afterLen
						const secretBytes = paramData.slice(paramPos, paramPos + len)
						secret = base32Encode(secretBytes)
						paramPos += len
					} else if (paramField === 2 && paramWire === 2) {
						const [len, afterLen] = decodeVarint(paramData, paramPos)
						paramPos = afterLen
						account = new TextDecoder().decode(paramData.slice(paramPos, paramPos + len))
						paramPos += len
					} else if (paramField === 3 && paramWire === 2) {
						const [len, afterLen] = decodeVarint(paramData, paramPos)
						paramPos = afterLen
						issuer = new TextDecoder().decode(paramData.slice(paramPos, paramPos + len))
						paramPos += len
					} else if (paramWire === 0) {
						const [, nextPos] = decodeVarint(paramData, paramPos)
						paramPos = nextPos
					} else if (paramWire === 2) {
						const [len, afterLen] = decodeVarint(paramData, paramPos)
						paramPos = afterLen + len
					}
				}

				if (secret && account) {
					accounts.push({
						id: crypto.randomUUID(),
						issuer: issuer || 'Unknown',
						account,
						secret,
					})
				}
			} else if (wireType === 0) {
				const [, nextPos] = decodeVarint(data, pos)
				pos = nextPos
			} else if (wireType === 2) {
				const [length, afterLength] = decodeVarint(data, pos)
				pos = afterLength + length
			}
		}

		return accounts
	} catch (err) {
		return []
	}
}
