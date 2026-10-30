"use strict";

/*
 * Seiten-Logik ohne jQuery:
 * - Navigation wird beim Runterscrollen fix und weiß, aktiver Abschnitt wird markiert
 * - "Nach oben"-Knopf erscheint nach etwas Scrollen
 * - Mobiles Menü auf- und zuklappen
 * - Elemente mit .reveal blenden beim Reinscrollen ein
 * - Galerie-Bilder öffnen sich groß in einem <dialog>
 * Weiches Scrollen zu den Abschnitten macht CSS (scroll-behavior: smooth).
 */

(function () {
	// Das mobile Menü bekommt dieselben Links wie die Desktop-Navigation
	document.getElementById("nav-mobile").innerHTML = document.getElementById("nav-main").innerHTML;

	var header = document.getElementById("header");
	var content = document.getElementById("content");
	var scrollUp = document.getElementById("scrollUp");
	var navLinks = document.querySelectorAll("#nav-main a, #nav-mobile a");
	var sections = document.querySelectorAll(".scrollto[id]");

	/* --- Navigation, aktiver Abschnitt, Nach-oben-Knopf --- */

	var ticking = false;

	function update() {
		ticking = false;
		var solid = content.getBoundingClientRect().top <= 0;
		header.classList.toggle("nav-solid", solid);

		var offset = header.offsetHeight + 2;
		var current = null;
		sections.forEach(function (section) {
			if (section.getBoundingClientRect().top <= offset) {
				current = section.id;
			}
		});
		// Ganz unten angekommen: letzten Abschnitt markieren
		if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
			current = sections[sections.length - 1].id;
		}
		navLinks.forEach(function (link) {
			link.classList.toggle("active", solid && link.getAttribute("href") === "#" + current);
		});

		if (scrollUp) {
			scrollUp.classList.toggle("visible", window.scrollY > 300);
		}
	}

	window.addEventListener("scroll", function () {
		if (!ticking) {
			ticking = true;
			window.requestAnimationFrame(update);
		}
	}, { passive: true });
	window.addEventListener("resize", update);
	update();

	/* --- Mobiles Menü --- */

	var trigger = document.getElementById("nav-trigger");
	var mobileNav = document.getElementById("nav-mobile");

	function setMenu(open) {
		mobileNav.classList.toggle("expanded", open);
		trigger.querySelector("span").classList.toggle("open", open);
		trigger.setAttribute("aria-expanded", open ? "true" : "false");
	}

	trigger.addEventListener("click", function () {
		setMenu(!mobileNav.classList.contains("expanded"));
	});
	mobileNav.addEventListener("click", function (e) {
		if (e.target.closest("a")) {
			setMenu(false);
		}
	});

	/* --- Einblenden beim Scrollen --- */

	var revealItems = document.querySelectorAll(".reveal");
	if ("IntersectionObserver" in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add("visible");
					observer.unobserve(entry.target);
				}
			});
		}, { rootMargin: "0px 0px -10% 0px" });
		revealItems.forEach(function (el) { observer.observe(el); });
	} else {
		revealItems.forEach(function (el) { el.classList.add("visible"); });
	}

	/* --- Galerie-Lightbox --- */

	var dialog = document.getElementById("lightbox");
	var galleryLinks = Array.prototype.slice.call(document.querySelectorAll("#gallery a"));
	if (!dialog || !dialog.showModal || !galleryLinks.length) {
		return; // ohne <dialog>-Unterstützung öffnen die Links einfach das Bild
	}
	var dialogImg = dialog.querySelector("img");
	var index = 0;

	function show(i) {
		index = (i + galleryLinks.length) % galleryLinks.length;
		var link = galleryLinks[index];
		dialogImg.src = link.getAttribute("href");
		dialogImg.alt = link.querySelector("img").alt;
	}

	galleryLinks.forEach(function (link, i) {
		link.addEventListener("click", function (e) {
			e.preventDefault();
			show(i);
			dialog.showModal();
		});
	});

	dialog.querySelector(".lightbox-prev").addEventListener("click", function () { show(index - 1); });
	dialog.querySelector(".lightbox-next").addEventListener("click", function () { show(index + 1); });
	dialog.querySelector(".lightbox-close").addEventListener("click", function () { dialog.close(); });

	// Klick neben das Bild (auf den abgedunkelten Hintergrund) schließt
	dialog.addEventListener("click", function (e) {
		if (e.target === dialog) {
			dialog.close();
		}
	});

	dialog.addEventListener("keydown", function (e) {
		if (e.key === "ArrowLeft") { show(index - 1); }
		if (e.key === "ArrowRight") { show(index + 1); }
	});

	dialog.addEventListener("close", function () {
		dialogImg.removeAttribute("src");
	});
})();
