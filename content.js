// Loads portfolio content from Supabase and renders it into index.html.
// If anything fails, the static HTML already on the page stays visible.
(function () {
  var cfg = window.PORTFOLIO_CONFIG;
  if (!cfg || !window.supabase) return;
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Allow **bold** inside already-escaped text
  function inline(v) { return esc(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function lines(v) { return String(v || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function list(v) { return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function textBlock(v, cls) {
    var l = lines(v);
    if (l.length > 1) return '<ul class="' + cls + ' ps-3 mb-0">' + l.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>';
    return l.length ? '<p class="' + cls + ' mb-0">' + inline(l[0]) + '</p>' : '';
  }
  function set(id, html) { var el = document.getElementById(id); if (el && html) el.innerHTML = html; }
  function q(table) { return db.from(table).select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }); }

  var projects = [];

  function renderAbout(row) {
    if (!row || !row.about) return;
    var paras = String(row.about).split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    set('aboutText', paras.map(function (p, i) {
      return '<p class="fs-6 text-subtle ' + (i === paras.length - 1 ? 'mb-0' : 'mb-3') + '">' + inline(p).replace(/\n/g, '<br>') + '</p>';
    }).join(''));
  }

  function renderFocus(rows) {
    if (!rows.length) return;
    set('focusList', rows.map(function (r) {
      return '<div class="col"><div class="d-flex align-items-start gap-3">' +
        '<i class="' + esc(r.icon) + ' fs-5 mt-1"></i><div>' +
        '<h6 class="mb-1 text-white">' + esc(r.title) + '</h6>' +
        '<small class="text-subtle">' + inline(r.description) + '</small></div></div></div>';
    }).join(''));
  }

  function renderProjects(rows) {
    if (!rows.length) return;
    projects = rows;
    set('projectsContainer', rows.map(function (p, i) {
      var img = safeUrl(p.image_url);
      var thumb = '<div class="project-thumb">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy">' : '<i class="fa-solid fa-chart-simple"></i>') + '</div>';
      var chips = list(p.tech_stack).slice(0, 4).map(function (t) { return '<span class="badge bg-dark border border-secondary text-light">' + esc(t) + '</span>'; }).join('');
      return '<div class="col-md-6 col-lg-4 project-item" data-category="' + esc(p.category) + '">' +
        '<div class="glass-card h-100 d-flex flex-column justify-content-between"><div>' + thumb +
        '<div class="d-flex justify-content-between align-items-center mb-3 gap-2"><span class="project-tag">' + esc(p.tag) + '</span><small class="text-subtle text-nowrap">' + esc(p.period) + '</small></div>' +
        '<h5 class="fw-bold text-white mb-2">' + esc(p.title) + '</h5>' +
        '<p class="text-subtle small mb-3">' + inline(p.description) + '</p>' +
        '<div class="d-flex flex-wrap gap-1 mb-3">' + chips + '</div></div>' +
        '<button class="btn btn-outline-custom w-100 text-sm mt-3" data-project="' + i + '">Read Case Study <i class="fa-solid fa-arrow-right ms-1"></i></button>' +
        '</div></div>';
    }).join(''));
    // reset filter buttons to "All"
    document.querySelectorAll('.filter-btn').forEach(function (b, i) { b.classList.toggle('active', i === 0); });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-project]');
    if (!btn) return;
    var p = projects[+btn.getAttribute('data-project')];
    if (!p) return;
    var img = safeUrl(p.image_url);
    document.getElementById('pmTitle').textContent = p.title;
    document.getElementById('pmBody').innerHTML =
      (img ? '<img class="modal-hero" src="' + esc(img) + '" alt="' + esc(p.title) + '">' : '') +
      (p.problem ? '<h6 class="text-white fw-bold">The Problem</h6><p>' + inline(p.problem) + '</p>' : '') +
      (lines(p.what_i_did).length ? '<h6 class="text-white fw-bold">What I Did</h6><ul>' + lines(p.what_i_did).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>' : '') +
      (p.tech_stack ? '<h6 class="text-white fw-bold">Tech Stack</h6><p class="mb-0">' + list(p.tech_stack).map(esc).join(' · ') + '</p>' : '');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('projectModal')).show();
  });

  function renderSkills(rows) {
    if (!rows.length) return;
    var n = rows.length;
    set('skillsList', rows.map(function (g, i) {
      // first row of three, the rest in pairs (matches the original layout)
      var col = (n > 3 && i >= 3) ? 'col-md-6 col-lg-6' : 'col-md-6 col-lg-4';
      return '<div class="' + col + '"><div class="glass-card h-100">' +
        '<h5 class="fw-bold text-white mb-3"><i class="' + esc(g.icon) + ' me-2"></i>' + esc(g.title) + '</h5>' +
        '<div class="d-flex flex-wrap gap-2">' + list(g.items).map(function (s) { return '<span class="skill-badge">' + esc(s) + '</span>'; }).join('') + '</div>' +
        '</div></div>';
    }).join(''));
  }

  function renderTimeline(rows) {
    function item(r, isEdu) {
      var badge = isEdu && r.badge
        ? '<span class="badge bg-warning bg-opacity-25 text-warning">' + esc(r.badge) + '</span>'
        : '<span class="badge bg-primary bg-opacity-25 text-info">' + esc(r.period) + '</span>';
      var sub = isEdu ? esc(r.org) + (r.period ? ' (' + esc(r.period) + ')' : '') : esc(r.org);
      return '<div class="timeline-item"><div class="d-flex justify-content-between align-items-center mb-1 gap-2">' +
        '<h6 class="fw-bold text-white mb-0">' + esc(r.title) + '</h6>' + badge + '</div>' +
        '<p class="text-subtle small mb-2">' + sub + '</p>' + textBlock(r.description, 'text-subtle small') + '</div>';
    }
    var work = rows.filter(function (r) { return r.kind === 'work'; });
    var edu = rows.filter(function (r) { return r.kind === 'education'; });
    if (work.length) set('workList', work.map(function (r) { return item(r, false); }).join(''));
    if (edu.length) set('eduList', edu.map(function (r) { return item(r, true); }).join(''));
  }

  function renderPubs(rows) {
    var pubs = rows.filter(function (r) { return r.kind === 'publication'; });
    var recs = rows.filter(function (r) { return r.kind === 'recognition'; });
    if (pubs.length) set('pubList', pubs.map(function (r) {
      var link = safeUrl(r.link);
      var title = link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" class="text-white text-decoration-none">' + esc(r.title) + ' <i class="fa-solid fa-arrow-up-right-from-square small text-subtle"></i></a>' : esc(r.title);
      return '<div class="p-3 rounded bg-dark border border-secondary border-opacity-25">' +
        (r.year ? '<span class="badge bg-primary bg-opacity-25 text-info mb-1">' + esc(r.year) + '</span>' : '') +
        '<h6 class="fw-bold text-white mb-1">' + title + '</h6><p class="text-subtle small mb-0">' + esc(r.venue) + '</p></div>';
    }).join(''));
    if (recs.length) set('recList', recs.map(function (r) {
      var link = safeUrl(r.link);
      var title = esc(r.title) + (r.year && r.title.indexOf(r.year) === -1 ? ' (' + esc(r.year) + ')' : '');
      if (link) title = '<a href="' + esc(link) + '" target="_blank" rel="noopener" class="text-white text-decoration-none">' + title + '</a>';
      return '<li class="d-flex gap-3 align-items-start"><i class="' + esc(r.icon) + ' fs-5 mt-1"></i><div>' +
        '<h6 class="fw-bold text-white mb-0">' + title + '</h6><small class="text-subtle">' + esc(r.venue) + '</small></div></li>';
    }).join(''));
  }

  Promise.all([
    db.from('profile').select('*').eq('id', 1).maybeSingle(),
    q('focus_items'), q('projects'), q('skill_groups'), q('timeline'), q('publications')
  ]).then(function (res) {
    var failed = res.filter(function (r) { return r.error; });
    if (failed.length) { console.warn('Some content could not be loaded', failed.map(function (r) { return r.error.message; })); }
    if (!res[0].error) renderAbout(res[0].data);
    if (!res[1].error) renderFocus(res[1].data || []);
    if (!res[2].error) renderProjects(res[2].data || []);
    if (!res[3].error) renderSkills(res[3].data || []);
    if (!res[4].error) renderTimeline(res[4].data || []);
    if (!res[5].error) renderPubs(res[5].data || []);
  }).catch(function (err) { console.warn('Content load failed, showing built-in content.', err); });
})();
