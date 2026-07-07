// Mobile navigation toggle
document.addEventListener('click', function (e) {
  var toggle = e.target.closest('.nav-toggle');
  if (toggle) {
    var links = document.getElementById('navLinks');
    if (links) links.classList.toggle('open');
  }
});
