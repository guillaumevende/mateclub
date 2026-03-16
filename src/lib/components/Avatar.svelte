<script lang="ts">
	let { avatar, size = 'medium' }: { 
		avatar: string | null | undefined; 
		size?: 'small' | 'medium' | 'large' 
	} = $props();
	
	// Détecte si c'est une image (contient '/' pour userId/filename ou commence par avatar_ pour compatibilité)
	let isImage = $derived(typeof avatar === 'string' && (avatar.includes('/') || avatar.startsWith('avatar_')));
	
	const sizeStyles = {
		small: 'width: 48px; height: 48px;',
		medium: 'width: 64px; height: 64px;',
		large: 'width: 96px; height: 96px;'
	};
</script>

{#if isImage}
	<img 
		src="/uploads/avatars/{avatar}" 
		alt="Avatar" 
		style="{sizeStyles[size]} border-radius: 50%; object-fit: cover; border: 2px solid #1a1a2e;"
	/>
{:else}
	<span style="{sizeStyles[size]} display: flex; align-items: center; justify-content: center; background: #1a1a2e; border-radius: 50%; border: 2px solid #2a2a4e; font-size: {size === 'small' ? '28px' : size === 'medium' ? '36px' : '48px'};">
		{avatar || '☕'}
	</span>
{/if}
