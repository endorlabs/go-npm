const { dirname, join, relative, resolve } = require('path');
const {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
} = require('fs');

// In an npm-driven install, the postinstall script runs with cwd set to the
// installed package's root (e.g. node_modules/<pkg>/). The local `.bin`
// directory that consumers actually look up is therefore at `../.bin/`.
const DOT_BIN = resolve('..', '.bin');

function linkLocalBin(binName, sourceAbs) {
  const symlinkAbs = join(DOT_BIN, binName);
  const linkTarget = relative(DOT_BIN, sourceAbs);

  mkdirSync(DOT_BIN, { recursive: true });

  // Replace any stale symlink/file at the destination so we always end up with
  // a link pointing at the freshly downloaded binary.
  try {
    lstatSync(symlinkAbs);
    unlinkSync(symlinkAbs);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  symlinkSync(linkTarget, symlinkAbs);
  return symlinkAbs;
}

function verifyAndPlaceBinary(binName, binPath, callback) {
  const sourceAbs = resolve(binPath, binName);

  if (!existsSync(sourceAbs)) {
    return callback(`Downloaded binary does not contain the binary specified in configuration - ${binName}`);
  }

  try {
    // The download stream sets mode 0o755, but chmod is cheap and guards
    // against archive strategies (tar/zip) that don't preserve the bit.
    chmodSync(sourceAbs, 0o755);

    // npm's bin-links pass runs before postinstall and skips packages whose
    // bin target doesn't exist yet. Create the link ourselves so consumers
    // (including `npm exec` / `npx`) can resolve the binary locally.
    const linkPath = linkLocalBin(binName, sourceAbs);
    console.log('Linked binary at', linkPath, '->', relative(DOT_BIN, sourceAbs));
  } catch (err) {
    return callback(err);
  }

  callback(null);
}

module.exports = verifyAndPlaceBinary;
