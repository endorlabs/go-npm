const fs = require('fs');
const path = require('path');
const verifyAndPlaceBinary = require('../../src/assets/binary');

jest.mock('fs');

describe('verifyAndPlaceBinary()', () => {
  let callback;

  beforeEach(() => {
    jest.clearAllMocks();
    callback = jest.fn();
  });

  it('should call callback with error if downloaded binary is missing', () => {
    fs.existsSync.mockReturnValueOnce(false);

    verifyAndPlaceBinary('command', './bin', callback);

    expect(callback).toHaveBeenCalledWith(
      'Downloaded binary does not contain the binary specified in configuration - command'
    );
  });

  it('should make the downloaded binary executable', () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.lstatSync.mockImplementationOnce(() => {
      const err = new Error('not found'); err.code = 'ENOENT'; throw err;
    });

    verifyAndPlaceBinary('command', './bin', callback);

    expect(fs.chmodSync).toHaveBeenCalledWith(path.resolve('./bin', 'command'), 0o755);
  });

  it('should create a symlink at ../.bin/<binName> pointing at the source binary', () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.lstatSync.mockImplementationOnce(() => {
      const err = new Error('not found'); err.code = 'ENOENT'; throw err;
    });

    verifyAndPlaceBinary('command', './bin', callback);

    const dotBinAbs = path.resolve('..', '.bin');
    const sourceAbs = path.resolve('./bin', 'command');
    expect(fs.mkdirSync).toHaveBeenCalledWith(dotBinAbs, { recursive: true });
    expect(fs.symlinkSync).toHaveBeenCalledWith(
      path.relative(dotBinAbs, sourceAbs),
      path.join(dotBinAbs, 'command')
    );
    expect(callback).toHaveBeenCalledWith(null);
  });

  it('should replace an existing entry at the destination', () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.lstatSync.mockReturnValueOnce({}); // entry exists

    verifyAndPlaceBinary('command', './bin', callback);

    const dotBinAbs = path.resolve('..', '.bin');
    expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(dotBinAbs, 'command'));
    expect(fs.symlinkSync).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null);
  });

  it('should propagate unexpected lstat errors via callback', () => {
    fs.existsSync.mockReturnValueOnce(true);
    const boom = new Error('boom'); boom.code = 'EACCES';
    fs.lstatSync.mockImplementationOnce(() => { throw boom; });

    verifyAndPlaceBinary('command', './bin', callback);

    expect(callback).toHaveBeenCalledWith(boom);
    expect(fs.symlinkSync).not.toHaveBeenCalled();
  });

  it('should NOT copy the binary to a global / npm-prefix path', () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.lstatSync.mockImplementationOnce(() => {
      const err = new Error('not found'); err.code = 'ENOENT'; throw err;
    });

    verifyAndPlaceBinary('command', './bin', callback);

    expect(fs.copyFileSync).not.toHaveBeenCalled();
  });
});
