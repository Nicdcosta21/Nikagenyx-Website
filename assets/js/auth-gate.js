(function () {
  function hasSession () {
    return document.cookie.split('; ')
      .some(p => p.startsWith('nikagenyx_session='));
  }
  if (!hasSession()) {
    window.location.replace('/employee_portal.html'); // or your login page
  }
})();
