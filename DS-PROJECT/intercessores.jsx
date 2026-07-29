/* intercessores.jsx — "Intercessores" tab: register the prayer network
   (name, country, contact) and send the prayer wall to them. Persists to
   localStorage. */

const { useState: useStateIn } = React;

window.SHEMA = window.SHEMA || {};
window.SHEMA.loadIntercessors = function () {
  try { return JSON.parse(localStorage.getItem('shema-intercessors') || '[]'); }
  catch (e) { return []; }
};
window.SHEMA.saveIntercessors = function (list) {
  try { localStorage.setItem('shema-intercessors', JSON.stringify(list)); } catch (e) {}
};

function intIsPhone(s) { return /[0-9]/.test((s || '')) && (s || '').replace(/[^0-9]/g, '').length >= 8; }

function IntercessoresView(props) {
  const projects = props.projects;
  const t = props.t;

  const [list, setList] = useStateIn(() => SHEMA.loadIntercessors());
  const [form, setForm] = useStateIn({ name: '', country: '', contact: '' });
  const persist = (next) => { setList(next); SHEMA.saveIntercessors(next); };

  const add = () => {
    if (!form.name.trim()) return;
    persist([{ id: Date.now().toString(), name: form.name.trim(), country: form.country.trim(), contact: form.contact.trim() }, ...list]);
    setForm({ name: '', country: '', contact: '' });
  };
  const remove = (id) => persist(list.filter(x => x.id !== id));

  // build the prayer wall text once (shared with all)
  const buildPrayerText = () => {
    const db = (SHEMA.buildPrayerDB ? SHEMA.buildPrayerDB(projects) : []);
    const today = new Date().toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });
    const lines = ['*Mural de Oração · Shema*', today, ''];
    db.slice(0, 30).forEach(e => {
      lines.push('🕊 ' + e.language + (e.base ? ' (' + e.base + ')' : ''));
      lines.push(e.text);
      lines.push('');
    });
    lines.push('"Assim na terra como no céu." — Mateus 6:10');
    return lines.join('\n');
  };

  const sendOne = (person) => {
    const text = buildPrayerText();
    if (intIsPhone(person.contact)) {
      const num = person.contact.replace(/[^0-9]/g, '');
      window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(text), '_blank');
    } else if (person.contact && person.contact.indexOf('@') >= 0) {
      window.location.href = 'mailto:' + encodeURIComponent(person.contact) +
        '?subject=' + encodeURIComponent(t.int_email_subject) +
        '&body=' + encodeURIComponent(text);
    } else {
      navigator.clipboard && navigator.clipboard.writeText(text);
    }
  };
  const broadcast = () => {
    const text = buildPrayerText();
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };

  // group by country
  const byCountry = {};
  list.forEach(p => { const c = p.country || '—'; (byCountry[c] = byCountry[c] || []).push(p); });
  const countries = Object.keys(byCountry).sort();
  const prayerCount = (SHEMA.buildPrayerDB ? SHEMA.buildPrayerDB(projects) : []).length;

  return (
    <div className={props.embedded ? 'in-wrap in-embed' : 'in-wrap'}>
      {props.embedded ? null : (
        <div className="in-intro">
          <p className="in-eyebrow">{t.int_eyebrow}</p>
          <h1 className="in-title">{t.int_title}</h1>
          <p className="in-lead">{t.int_lead}</p>
        </div>
      )}

      {/* add form */}
      <div className="in-form">
        <div className="in-form-fields">
          <div className="in-field">
            <label>{t.int_name}</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t.int_name_ph} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          </div>
          <div className="in-field">
            <label>{t.int_country}</label>
            <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder={t.int_country_ph} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          </div>
          <div className="in-field">
            <label>{t.int_contact}</label>
            <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder={t.int_contact_ph} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          </div>
        </div>
        <button className="in-add" onClick={add}>{t.int_add}</button>
      </div>

      {/* toolbar */}
      <div className="in-bar">
        <span className="in-count">{list.length} {t.int_registered}</span>
        {list.length > 0 ? (
          <button className="in-broadcast" onClick={broadcast}>{t.int_broadcast} <span>{prayerCount}</span></button>
        ) : null}
      </div>

      {/* list */}
      {list.length === 0 ? (
        <div className="in-empty">{t.int_empty}</div>
      ) : (
        countries.map(c => (
          <div className="in-country-group" key={c}>
            <div className="in-country-head">{c} <span>{byCountry[c].length}</span></div>
            <div className="in-rows">
              {byCountry[c].map(person => (
                <div className="in-row" key={person.id}>
                  <div className="in-avatar">{(person.name || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="in-row-main">
                    <div className="in-row-name">{person.name}</div>
                    <div className="in-row-contact">{person.contact || '—'}</div>
                  </div>
                  <button className="in-send" onClick={() => sendOne(person)} title={t.int_send}>
                    {intIsPhone(person.contact) ? t.int_send_wa : (person.contact.indexOf('@') >= 0 ? t.int_send_mail : t.int_copy)}
                  </button>
                  <button className="in-del" onClick={() => remove(person.id)} title="×">×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <p className="in-foot-note">{t.int_footnote}</p>
    </div>
  );
}

Object.assign(window, { IntercessoresView });
