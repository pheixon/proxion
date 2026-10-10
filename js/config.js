window.SITE_CONFIG = {
  // 'api': Express + SQLite from server/ (on-site admin); 'sanity': Sanity CDN, no server needed (edit in Studio)
  dataSource: 'api',
  sanity: {
    projectId: 'ev6593d3',
    dataset: 'production',
    apiVersion: '2025-01-01',
    studioUrl: 'https://proxion.sanity.studio',
  },
  // sanity mode only: browser key restricted to your domain and the YouTube Data API v3
  youtubeApiKey: '',
};
