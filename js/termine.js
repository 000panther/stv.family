/* Termine aus termine.ics (per Cronjob vom Kalender geholt) anzeigen. Benötigt ical.js. */
(function () {
    const container = document.getElementById('termine-liste');
    if (!container || !window.ICAL) { return; }

    const MAX_TERMINE = 10;
    const MAX_VORAUS_TAGE = 365;

    const ZEITZONE = 'Europe/Vienna';
    const datumOptionen = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const datum = new Intl.DateTimeFormat('de-AT', Object.assign({ timeZone: ZEITZONE }, datumOptionen));
    const uhrzeit = new Intl.DateTimeFormat('de-AT', { timeZone: ZEITZONE, hour: '2-digit', minute: '2-digit' });
    // Ganztägige Termine haben keine Zeitzone und werden als lokales Datum gelesen
    const datumGanztags = new Intl.DateTimeFormat('de-AT', datumOptionen);

    function meldung(text) {
        container.textContent = '';
        const p = document.createElement('p');
        p.textContent = text;
        container.appendChild(p);
    }

    function zeitText(start, ende, ganztags) {
        const fmt = ganztags ? datumGanztags : datum;
        const text = fmt.format(start);
        const gleicherTag = text === fmt.format(ende);
        if (ganztags) {
            return gleicherTag ? text : text + ' – ' + fmt.format(ende);
        }
        if (gleicherTag) {
            return text + ', ' + uhrzeit.format(start) + (ende > start ? ' – ' + uhrzeit.format(ende) : '');
        }
        return text + ', ' + uhrzeit.format(start) + ' – ' + datum.format(ende) + ', ' + uhrzeit.format(ende);
    }

    function sammleTermine(ics) {
        const comp = new ICAL.Component(ICAL.parse(ics));

        comp.getAllSubcomponents('vtimezone').forEach(function (tz) {
            const zone = new ICAL.Timezone(tz);
            if (!ICAL.TimezoneService.has(zone.tzid)) { ICAL.TimezoneService.register(zone.tzid, zone); }
        });

        const master = {};
        const ausnahmen = [];
        comp.getAllSubcomponents('vevent').forEach(function (v) {
            if (v.hasProperty('recurrence-id')) {
                ausnahmen.push(new ICAL.Event(v));
            } else {
                const e = new ICAL.Event(v);
                master[e.uid] = e;
            }
        });
        ausnahmen.forEach(function (e) {
            if (master[e.uid]) { master[e.uid].relateException(e); }
        });

        const jetzt = new Date();
        const bis = new Date(jetzt.getTime() + MAX_VORAUS_TAGE * 86400000);
        const treffer = [];

        Object.keys(master).forEach(function (uid) {
            const event = master[uid];
            if (!event.startDate) { return; }

            function aufnehmen(details) {
                const start = details.startDate.toJSDate();
                const ganztags = details.startDate.isDate;
                let ende = details.endDate ? details.endDate.toJSDate() : start;
                if (ganztags && ende > start) { ende = new Date(ende.getTime() - 1); }
                if (ende < jetzt || start > bis) { return false; }
                treffer.push({
                    start: start,
                    ende: ende,
                    ganztags: ganztags,
                    titel: details.item.summary || '',
                    ort: details.item.location || '',
                    beschreibung: details.item.description || ''
                });
                return true;
            }

            if (event.isRecurring()) {
                const it = event.iterator();
                let zeit, n = 0;
                while ((zeit = it.next()) && n++ < 1000) {
                    const d = event.getOccurrenceDetails(zeit);
                    if (d.startDate.toJSDate() > bis) { break; }
                    aufnehmen(d);
                }
            } else {
                aufnehmen({ startDate: event.startDate, endDate: event.endDate, item: event });
            }
        });

        treffer.sort(function (a, b) { return a.start - b.start; });
        return treffer.slice(0, MAX_TERMINE);
    }

    function anzeigen(termine) {
        if (!termine.length) { return meldung('Aktuell sind keine Termine geplant.'); }
        container.textContent = '';
        termine.forEach(function (t) {
            const s = document.createElement('section');
            const h = document.createElement('h5');
            h.textContent = t.titel;
            s.appendChild(h);

            const b = document.createElement('b');
            b.textContent = zeitText(t.start, t.ende, t.ganztags);
            s.appendChild(b);

            [t.ort, t.beschreibung].forEach(function (text) {
                if (!text) { return; }
                const p = document.createElement('p');
                p.textContent = text;
                s.appendChild(p);
            });
            container.appendChild(s);
        });
    }

    fetch('termine.ics')
        .then(function (antwort) {
            if (!antwort.ok) { throw new Error('HTTP ' + antwort.status); }
            return antwort.text().then(function (ics) {
                try { anzeigen(sammleTermine(ics)); }
                catch (e) { meldung('Die Termine konnten nicht gelesen werden.'); }
            });
        })
        .catch(function () { meldung('Die Termine konnten nicht geladen werden.'); });
})();
