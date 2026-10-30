"use strict";

(function () {
	const header = document.getElementById('header');
	const content = document.getElementById('content');
	const scrollUp = document.getElementById('scrollUp');
	const navMain = document.getElementById('nav-main');
	const navMobile = document.getElementById('nav-mobile');
	const navTrigger = document.querySelector('#nav-trigger span');

	/* Responsive Navigation */
	navMobile.innerHTML = navMain.innerHTML;
	const mobileList = navMobile.querySelector('ul');

	function slide(el, open) {
		el.getAnimations().forEach(function (a) { a.cancel(); });
		const zu = { height: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' };
		if (open) { el.style.display = 'block'; }
		const auf = { height: el.offsetHeight + 'px', overflow: 'hidden' };
		const anim = el.animate(open ? [zu, auf] : [auf, zu], { duration: 250, easing: 'ease' });
		if (!open) { anim.onfinish = function () { el.style.display = 'none'; }; }
	}

	function toggleNav(open) {
		mobileList.classList.toggle('expanded', open);
		navTrigger.classList.toggle('open', open);
		slide(mobileList, open);
	}

	navTrigger.addEventListener('click', function () {
		toggleNav(!mobileList.classList.contains('expanded'));
	});

	mobileList.querySelectorAll('a').forEach(function (a) {
		a.addEventListener('click', function () {
			if (mobileList.classList.contains('expanded')) { toggleNav(false); }
		});
	});

	/* Sticky Navigation, aktiver Menüpunkt und Scroll-Up-Button */
	const sections = Array.prototype.slice.call(document.querySelectorAll('.scrollto'));
	const navLinks = Array.prototype.slice.call(header.querySelectorAll('nav a[href^="#"]'));
	let ticking = false;

	function onScroll() {
		ticking = false;
		const y = window.scrollY;
		const headerHeight = header.offsetHeight;

		const solid = content.getBoundingClientRect().top <= 0;
		if (solid !== header.classList.contains('nav-solid')) {
			header.classList.toggle('nav-solid', solid);
			header.classList.toggle('fadeInDown', solid);
		}

		scrollUp.classList.toggle('visible', y > 300);

		let aktiv = null;
		sections.forEach(function (s) {
			const top = s.getBoundingClientRect().top + y - headerHeight;
			if (y >= top && y <= top + s.offsetHeight) { aktiv = s.id; }
		});
		if (y > 0 && y + window.innerHeight >= document.documentElement.scrollHeight) {
			aktiv = navLinks[navLinks.length - 1].getAttribute('href').slice(1);
		}
		navLinks.forEach(function (a) {
			a.classList.toggle('active', a.getAttribute('href') === '#' + aktiv);
		});
	}

	function requestScroll() {
		if (!ticking) {
			ticking = true;
			requestAnimationFrame(onScroll);
		}
	}

	window.addEventListener('scroll', requestScroll, { passive: true });
	window.addEventListener('resize', requestScroll);
	onScroll();

	/* Galerie-Lightbox */
	const lightbox = document.getElementById('lightbox');
	const lightboxImage = lightbox.querySelector('.lightbox-image');
	const galleryLinks = Array.prototype.slice.call(document.querySelectorAll('#gallery a'));
	let current = 0;

	function show(index) {
		current = (index + galleryLinks.length) % galleryLinks.length;
		const link = galleryLinks[current];
		const thumb = link.querySelector('img');
		lightboxImage.src = link.href;
		lightboxImage.alt = thumb ? thumb.alt : '';
	}

	galleryLinks.forEach(function (link, i) {
		link.addEventListener('click', function (e) {
			e.preventDefault();
			show(i);
			lightbox.showModal();
		});
	});

	lightbox.querySelector('.lightbox-close').addEventListener('click', function () { lightbox.close(); });
	lightbox.querySelector('.lightbox-prev').addEventListener('click', function () { show(current - 1); });
	lightbox.querySelector('.lightbox-next').addEventListener('click', function () { show(current + 1); });
	lightbox.addEventListener('click', function (e) {
		if (e.target === lightbox) { lightbox.close(); }
	});
	lightbox.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowLeft') { show(current - 1); }
		if (e.key === 'ArrowRight') { show(current + 1); }
	});

	/* Animationen beim Einblenden (animate.css) */
	function revealOnScroll() {
		const items = document.querySelectorAll('.wow:not(.animated)');
		if (!('IntersectionObserver' in window)) { return; }

		const observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) { return; }
				const el = entry.target;
				observer.unobserve(el);
				el.style.visibility = 'visible';
				if (el.dataset.wowDelay) { el.style.animationDelay = el.dataset.wowDelay; }
				el.classList.add('animated');
			});
		});

		items.forEach(function (el) {
			el.style.visibility = 'hidden';
			observer.observe(el);
		});
	}

	/* Preloader und Animationen */
	function onLoad() {
		document.body.classList.add('loaded');

		revealOnScroll();
	}

	if (document.readyState === 'complete') {
		onLoad();
	} else {
		window.addEventListener('load', onLoad);
	}
})();
