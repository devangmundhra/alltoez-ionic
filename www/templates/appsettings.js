AppSettings = {
  // @if ENV == 'DEVELOPMENT'
  baseApiUrl: 'http://localhost:8000/api/v1/',
  debug: true
  // @endif
  // @if ENV == 'PRODUCTION'
  baseApiUrl: 'http://www.alltoez.com/api/v1/'
  // @endif
}
