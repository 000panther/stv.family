/* Termine aus termine.ics (per Cronjob vom Kalender geholt) anzeigen. Benötigt ical.js. */
(function () {
    var container = document.getElementById('termine-liste');
    if (!container || !window.ICAL) { return; }

    var MAX_TERMINE = 10;
    var MAX_VORAUS_TAGE = 365;

    var ZEITZONE = 'Europe/Vienna';
    var datumOptionen = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    var datum = new Intl.DateTimeFormat('de-AT', Object.assign({ timeZone: ZEITZONE }, datumOptionen));
    var uhrzeit = new Intl.DateTimeFormat('de-AT', { timeZone: ZEITZONE, hour: '2-digit', minute: '2-digit' });
    // Ganztägige Termine haben keine Zeitzone und werden als lokales Datum gelesen
    var datumGanztags = new Intl.DateTimeFormat('de-AT', datumOptionen);

    function meldung(text) {
        container.textContent = '';
        var p = document.createElement('p');
        p.textContent = text;
        container.appendChild(p);
    }

    function zeitText(start, ende, ganztags) {
        var fmt = ganztags ? datumGanztags : datum;
        var text = fmt.format(start);
        var gleicherTag = text === fmt.format(ende);
        if (ganztags) {
            return gleicherTag ? text : text + ' – ' + fmt.format(ende);
        }
        if (gleicherTag) {
            return text + ', ' + uhrzeit.format(start) + (ende > start ? ' – ' + uhrzeit.format(ende) : '');
        }
        return text + ', ' + uhrzeit.format(start) + ' – ' + datum.format(ende) + ', ' + uhrzeit.format(ende);
    }

    function sammleTermine(ics) {
        var comp = new ICAL.Component(ICAL.parse(ics));

        comp.getAllSubcomponents('vtimezone').forEach(function (tz) {
            var zone = new ICAL.Timezone(tz);
            if (!ICAL.TimezoneService.has(zone.tzid)) { ICAL.TimezoneService.register(zone.tzid, zone); }
        });

        var master = {};
        var ausnahmen = [];
        comp.getAllSubcomponents('vevent').forEach(function (v) {
            if (v.hasProperty('recurrence-id')) {
                ausnahmen.push(new ICAL.Event(v));
            } else {
                var e = new ICAL.Event(v);
                master[e.uid] = e;
            }
        });
        ausnahmen.forEach(function (e) {
            if (master[e.uid]) { master[e.uid].relateException(e); }
        });

        var jetzt = new Date();
        var bis = new Date(jetzt.getTime() + MAX_VORAUS_TAGE * 86400000);
        var treffer = [];

        Object.keys(master).forEach(function (uid) {
            var event = master[uid];
            if (!event.startDate) { return; }

            function aufnehmen(details) {
                var start = details.startDate.toJSDate();
                var ganztags = details.startDate.isDate;
                var ende = details.endDate ? details.endDate.toJSDate() : start;
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
                var it = event.iterator();
                var zeit, n = 0;
                while ((zeit = it.next()) && n++ < 1000) {
                    var d = event.getOccurrenceDetails(zeit);
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
            var s = document.createElement('section');
            var h = document.createElement('h3');
            h.textContent = t.titel;
            s.appendChild(h);

            var b = document.createElement('b');
            b.textContent = zeitText(t.start, t.ende, t.ganztags);
            s.appendChild(b);

            [t.ort, t.beschreibung].forEach(function (text) {
                if (!text) { return; }
                var p = document.createElement('p');
                p.textContent = text;
                s.appendChild(p);
            });
            container.appendChild(s);
        });
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'termine.ics');
    xhr.onload = function () {
        if (xhr.status !== 200) { return meldung('Die Termine konnten nicht geladen werden.'); }
        try { anzeigen(sammleTermine(xhr.responseText)); }
        catch (e) { meldung('Die Termine konnten nicht gelesen werden.'); }
    };
    xhr.onerror = function () { meldung('Die Termine konnten nicht geladen werden.'); };
    xhr.send();
})();
