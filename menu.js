// Ouvrir le menu et afficher la croix
document.querySelector('.navbar-toggler').addEventListener('click', function() {
  const navbarNav = document.querySelector('.navbar-nav');
  const closeButton = document.querySelector('.navbar-toggler-close');
  navbarNav.classList.toggle('show');
  closeButton.style.display = navbarNav.classList.contains('show') ? 'block' : 'none';
  document.querySelector('.navbar-toggler').style.display = navbarNav.classList.contains('show') ? 'none' : 'block'; // Masquer le hamburger
});

// Fermer le menu en cliquant sur la croix
document.querySelector('.navbar-toggler-close').addEventListener('click', function() {
  const navbarNav = document.querySelector('.navbar-nav');
  navbarNav.classList.remove('show');
  this.style.display = 'none'; // Masquer la croix
  document.querySelector('.navbar-toggler').style.display = 'block'; // Afficher le hamburger
});
