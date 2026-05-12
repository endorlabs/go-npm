const { join } = require('path');
const { createWriteStream } = require('fs');

/**
 * Move strategy for binary resources without compression.
 */
function move({ opts, req, onSuccess, onError }) {

  // mode 0o755 ensures the downloaded binary lands executable, so the package's
  // declared `bin` entry is usable without a separate chmod step.
  const stream = createWriteStream(join(opts.binPath, opts.binName), { mode: 0o755 });

  stream.on('error', onError);
  stream.on('close', onSuccess);

  req.pipe(stream);
}

module.exports = move;
