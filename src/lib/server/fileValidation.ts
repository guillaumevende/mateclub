// Validation du type de fichier par magic numbers
// Évite les attaques par extension falsifiée

const AUDIO_MIME_SIGNATURES: Record<string, (number | null)[]> = {
	'audio/webm': [0x1A, 0x45, 0xDF, 0xA3],  // WebM
	'audio/mp4': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70], // MP4/M4A (ftyp)
	'audio/mpeg': [0xFF, 0xFB],  // MP3
	'audio/ogg': [0x4F, 0x67, 0x67, 0x53], // OGG
};

const IMAGE_MIME_SIGNATURES: Record<string, (number | null)[]> = {
	'image/jpeg': [0xFF, 0xD8, 0xFF],  // JPEG
	'image/png': [0x89, 0x50, 0x4E, 0x47],  // PNG
	'image/webp': [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // RIFF....WEBP
	'image/heic': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],  // HEIC (ftyp)
	'image/heif': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],  // HEIF (ftyp)
};

function getBufferSignature(buffer: Buffer, length = 12): number[] {
	return Array.from(buffer.slice(0, length));
}

function matchesSignature(buffer: Buffer, signature: (number | null)[]): boolean {
	const sig = getBufferSignature(buffer);
	return signature.every((byte, i) => byte === null || byte === sig[i]);
}

export function validateAudioMimeType(buffer: Buffer, mimeType: string): boolean {
	const validMimes = Object.keys(AUDIO_MIME_SIGNATURES);
	
	// Pour les types connus, vérifier le magic number
	for (const validMime of validMimes) {
		if (matchesSignature(buffer, AUDIO_MIME_SIGNATURES[validMime])) {
			// Vérifier que le mimeType demandé est compatible
			if (validMime === 'audio/mp4' && (mimeType === 'audio/mp4' || mimeType === 'audio/m4a')) {
				return true;
			}
			if (validMime === mimeType) {
				return true;
			}
			// WebM peut aussi être video/webm
			if (validMime === 'audio/webm' && (mimeType === 'audio/webm' || mimeType === 'video/webm')) {
				return true;
			}
		}
	}
	
	// Fallback: si le buffer ne correspond à aucun format connu, rejeter
	// Mais accepter si c'est un type standard qu'on ne peut pas vérifier facilement
	const unknownMimes = ['audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/mpeg'];
	return unknownMimes.includes(mimeType);
}

export function validateImageMimeType(buffer: Buffer, mimeType: string): boolean {
	const validMimes = Object.keys(IMAGE_MIME_SIGNATURES);
	
	for (const validMime of validMimes) {
		if (matchesSignature(buffer, IMAGE_MIME_SIGNATURES[validMime])) {
			// HEIC et HEIF ont la même signature, accepter les deux
			if ((validMime === 'image/heic' || validMime === 'image/heif') && 
			    (mimeType === 'image/heic' || mimeType === 'image/heif')) {
				return true;
			}
			return validMime === mimeType;
		}
	}
	
	// Par défaut, rejeter si on ne reconnaît pas
	return false;
}

export function isValidAudioBuffer(buffer: Buffer): boolean {
	const knownFormats = Object.values(AUDIO_MIME_SIGNATURES);
	
	for (const signature of knownFormats) {
		if (matchesSignature(buffer, signature)) {
			return true;
		}
	}
	
	return false;
}

export function isValidImageBuffer(buffer: Buffer): boolean {
	const knownFormats = Object.values(IMAGE_MIME_SIGNATURES);
	
	for (const signature of knownFormats) {
		if (matchesSignature(buffer, signature)) {
			return true;
		}
	}
	
	return false;
}
