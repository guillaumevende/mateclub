export function scrollLock(node: HTMLElement, isActive: boolean) {
	let originalOverflow: string;
	let originalScrollY: number;

	function lock() {
		originalOverflow = document.body.style.overflow;
		originalScrollY = window.scrollY;
		document.body.style.overflow = 'hidden';
		document.body.style.marginTop = `-${originalScrollY}px`;
	}

	function unlock() {
		const currentScrollY = parseFloat(document.body.style.marginTop || '0');
		document.body.style.overflow = originalOverflow || '';
		document.body.style.marginTop = '';
		window.scrollTo(0, -currentScrollY);
	}

	if (isActive) {
		lock();
	}

	return {
		update(newIsActive: boolean) {
			if (newIsActive) {
				lock();
			} else {
				unlock();
			}
		},
		destroy() {
			unlock();
		}
	};
}
