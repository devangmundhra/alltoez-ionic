AppSettings = {
  // @if ENV == 'DEVELOPMENT'
  baseApiUrl: 'http://localhost:8000/api/v1/',
  fbAppId: '436853689787509',
  debug: true
  // @endif
  // @if ENV == 'PRODUCTION'
  baseApiUrl: 'https://www.alltoez.com/api/v1/',
  fbAppId: '869081253104828',
  // @endif
}
