const config = {
  title: 'Nikagenyx Vision Tech',
  description: 'Built for the Moment. Designed for Momentum.',
  url: 'https://www.nikagenyx.com',
  apiBaseUrl: 'https://www.nikagenyx.com/api',
  appBaseUrl: 'https://www.nikagenyx.com/account/app',
  contactEmail: 'support@nikagenyx.com',
  logo: {
    main: '/assets/logo_original.png',
    favicon: '/assets/logo_original.png'
  },
  meta: {
    themeColor: '#000000',
    twitterCard: 'summary_large_image',
    ogType: 'website'
  },
  routes: {
    login: '/login',
    app: {
      base: '/account/app',
      dashboard: '/account/app',
      reports: '/account/app/reports',
      schedules: '/account/app/schedules',
      templates: '/account/app/templates',
      settings: '/account/app/settings'
    }
  }
};

export default config;
