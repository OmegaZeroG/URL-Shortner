// Must be required first — see instrument.js for why (Sentry auto-
// instrumentation has to patch modules before they're required elsewhere).
// It also loads dotenv, so a separate require('dotenv').config() here isn't
// needed.
require('./instrument');
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`URL Shortener API listening on port ${PORT}`);
});
