<script lang="ts">
	import Avatar from './Avatar.svelte';

	interface Props {
		userId: number;
		avatar: string | null | undefined;
		size?: 'small' | 'medium' | 'large';
		label?: string;
		stopPropagation?: boolean;
		extraClass?: string;
	}

	let {
		userId,
		avatar,
		size = 'medium',
		label = 'Voir le profil',
		stopPropagation = false,
		extraClass = ''
	}: Props = $props();
</script>

<a
	href={`/profile/${userId}`}
	class={`user-profile-avatar-link ${extraClass}`.trim()}
	aria-label={label}
	onclick={(event) => {
		if (stopPropagation) {
			event.stopPropagation();
		}
	}}
>
	<Avatar {avatar} {size} />
</a>

<style>
	.user-profile-avatar-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		text-decoration: none;
	}

	.user-profile-avatar-link:focus-visible {
		outline: 2px solid #e94560;
		outline-offset: 2px;
	}
</style>
